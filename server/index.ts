import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import helmet from "helmet";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { fetchAndImportProducts } from "./xmlParser";
import { pool } from "./db";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";
import { generateBlogPostForProduct } from "./blogGenerator";
import path from "path";
import fs from "fs";

async function generateMissingBlogPosts(): Promise<{ created: number; errors: number }> {
  const allProducts = await storage.getAllProducts();
  let created = 0;
  let errors = 0;
  const failedIds: string[] = [];

  for (const product of allProducts) {
    try {
      const existing = await storage.getBlogPostByProductId(product.id);
      if (existing) continue;
      const generated = generateBlogPostForProduct(product);
      await storage.createBlogPost({
        ...generated,
        productId: product.id,
        imageUrl: product.imageUrl || null,
        published: true,
      });
      created++;
    } catch (err) {
      errors++;
      failedIds.push(product.id);
      log(`Blog generation failed for product ${product.id}: ${err}`, "blog");
    }
  }

  if (failedIds.length > 0) {
    log(`Blog generation completed with ${errors} failure(s). Failed IDs: ${failedIds.join(", ")}`, "blog");
  }

  return { created, errors };
}

async function migrateProductNames() {
  const client = await pool.connect();
  try {
    const checkResult = await client.query(
      "SELECT COUNT(*) FROM products WHERE title ILIKE '%educational software%'"
    );
    const count = parseInt(checkResult.rows[0].count);
    if (count === 0) return 0;

    // Revert: rename "Educational Software" back to "Test Bank"
    await client.query(`
      UPDATE products 
      SET title = REGEXP_REPLACE(title, '\\s*Educational Software$', ' Test Bank', 'i')
      WHERE title ILIKE '%Educational Software'
    `);

    // Fix descriptions
    await client.query(`
      UPDATE products 
      SET description = REPLACE(REPLACE(REPLACE(description, 'educational software', 'test bank'), 'Educational Software', 'Test Bank'), 'Educational software', 'Test bank')
      WHERE description ILIKE '%educational software%'
    `);

    // Regenerate slugs for renamed products
    await client.query(`
      UPDATE products
      SET slug = LOWER(REGEXP_REPLACE(REGEXP_REPLACE(title, '[^a-zA-Z0-9]+', '-', 'g'), '^-|-$', '', 'g')) || '-' || id
      WHERE title ILIKE '%test bank%' AND slug ILIKE '%educational-software%'
    `);

    // Revert category
    await client.query(`
      UPDATE products 
      SET category = 'Test Banks'
      WHERE category = 'Study Materials'
    `);

    return count;
  } finally {
    client.release();
  }
}

const app = express();
const httpServer = createServer(app);

app.set("trust proxy", 1);

// Security headers (helmet) — relaxed CSP because admin allows custom HTML
// injection (GA tag, verification scripts) and we serve images from external CDNs.
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }),
);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

if (process.env.NODE_ENV === "production" && !process.env.SESSION_SECRET) {
  throw new Error(
    "SESSION_SECRET environment variable is required in production",
  );
}

const PostgresSessionStore = connectPg(session);

app.use(
  session({
    store: new PostgresSessionStore({
      pool,
      tableName: "session",
      createTableIfMissing: true,
    }),
    name: "tbb.sid",
    secret: process.env.SESSION_SECRET || "testbankbooks-dev-only-secret",
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      sameSite: "lax",
    },
  })
);

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

// Serve locally uploaded product images and download files
const uploadsDir = path.resolve(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
app.use("/uploads", express.static(uploadsDir));

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  await registerRoutes(httpServer, app);

  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    console.error("Internal Server Error:", err);

    if (res.headersSent) {
      return next(err);
    }

    return res.status(status).json({ message });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    async () => {
      log(`serving on port ${port}`);
      
      // Import products from XML feed on startup
      try {
        const count = await fetchAndImportProducts();
        log(`Product database ready with ${count} products`, "import");
      } catch (error) {
        log(`Warning: Could not import products: ${error}`, "import");
      }

      // Ensure product names use "Test Bank" (revert any prior rename)
      try {
        const migrated = await migrateProductNames();
        if (migrated > 0) {
          log(`Restored ${migrated} product names back to "Test Bank"`, "migration");
        }
      } catch (error) {
        log(`Warning: Product name migration failed: ${error}`, "migration");
      }

      // Auto-generate blog posts for any products that don't have one yet
      try {
        const { created, errors } = await generateMissingBlogPosts();
        if (created > 0) {
          log(`Generated ${created} missing blog post(s)`, "blog");
        }
        if (errors > 0) {
          log(`Blog generation had ${errors} error(s) — check logs above`, "blog");
        }
      } catch (error) {
        log(`Warning: Blog post generation failed: ${error}`, "blog");
      }

      // Scan for abandoned carts every 30 minutes
      setInterval(async () => {
        try {
          const found = await storage.detectAndRecordAbandonedCarts(60);
          if (found > 0) {
            log(`Detected ${found} abandoned cart(s)`, "abandoned-carts");
          }
        } catch (error) {
          log(`Error scanning abandoned carts: ${error}`, "abandoned-carts");
        }
      }, 30 * 60 * 1000);
    },
  );
})();
