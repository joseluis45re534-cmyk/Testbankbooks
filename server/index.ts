import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { fetchAndImportProducts } from "./xmlParser";
import { pool } from "./db";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";

async function migrateProductNames() {
  const client = await pool.connect();
  try {
    const checkResult = await client.query(
      "SELECT COUNT(*) FROM products WHERE title ILIKE '%test bank%'"
    );
    const count = parseInt(checkResult.rows[0].count);
    if (count === 0) return 0;

    await client.query(`
      UPDATE products 
      SET title = REGEXP_REPLACE(title, '\\s*Test Bank$', ' Educational Software', 'i'),
          description = REPLACE(REPLACE(REPLACE(description, 'test bank', 'educational software'), 'Test Bank', 'Educational Software'), 'Test bank', 'Educational software')
      WHERE title ILIKE '%Test Bank'
    `);

    await client.query(`
      UPDATE products 
      SET title = REGEXP_REPLACE(title, '^Test [Bb]ank\\s*[-]?\\s*', '') || ' Educational Software'
      WHERE title ILIKE 'Test Bank%'
    `);

    await client.query(`
      UPDATE products 
      SET title = REGEXP_REPLACE(title, 'TEST BANK (FOR )?', '', 'i')
      WHERE title ILIKE 'TEST BANK%'
    `);

    await client.query(`
      UPDATE products
      SET slug = LOWER(REGEXP_REPLACE(REGEXP_REPLACE(title, '[^a-zA-Z0-9]+', '-', 'g'), '^-|-$', '', 'g')) || '-' || id
      WHERE title ILIKE '%educational software%'
    `);

    await client.query(`
      UPDATE products 
      SET category = 'Study Materials'
      WHERE category = 'Test Banks'
    `);

    return count;
  } finally {
    client.release();
  }
}

const app = express();
const httpServer = createServer(app);

app.set("trust proxy", 1);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

const PostgresSessionStore = connectPg(session);

app.use(
  session({
    store: new PostgresSessionStore({
      pool,
      tableName: "session",
      createTableIfMissing: true,
    }),
    secret: process.env.SESSION_SECRET || "testbankbooks-secret-key",
    resave: false,
    saveUninitialized: true,
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

      // Migrate product names: replace "Test Bank" with "Educational Software"
      try {
        const migrated = await migrateProductNames();
        if (migrated > 0) {
          log(`Migrated ${migrated} product names from "Test Bank" to "Educational Software"`, "migration");
        }
      } catch (error) {
        log(`Warning: Product name migration failed: ${error}`, "migration");
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
