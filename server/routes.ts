import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { importFromCsv, importFromCsvBuffer } from "./csvParser";
import { generateSecureToken, generateSignedUrl, verifySignedUrl, createWooCommerceAPI } from "./woocommerce";
import { z } from "zod";
import path from "path";
import bcrypt from "bcryptjs";
import multer from "multer";

declare module 'express-session' {
  interface SessionData {
    adminId?: string;
    adminUsername?: string;
  }
}

const addToCartSchema = z.object({
  productId: z.string().min(1, "Product ID is required"),
  quantity: z.number().int().positive().default(1),
});

const updateCartSchema = z.object({
  quantity: z.number().int().positive("Quantity must be a positive integer"),
});

const adminLoginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

const updateProductSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  price: z.string().optional(),
  salePrice: z.string().nullable().optional(),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
  seoTitle: z.string().optional(),
  seoDescription: z.string().optional(),
});

const bulkUpdateSchema = z.object({
  ids: z.array(z.string()),
  updates: updateProductSchema,
});

const paymentSettingSchema = z.object({
  provider: z.string(),
  enabled: z.boolean(),
  config: z.string().optional(),
});

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.session.adminId) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // Get all products with optional search and category filter
  app.get("/api/products", async (req, res) => {
    try {
      const search = req.query.search as string || "";
      const category = req.query.category as string || null;
      
      const products = await storage.getProductsBySearch(search, category);
      res.json(products);
    } catch (error) {
      console.error("Error fetching products:", error);
      res.status(500).json({ error: "Failed to fetch products" });
    }
  });

  // Get product by slug
  app.get("/api/products/:slug", async (req, res) => {
    try {
      const product = await storage.getProductBySlug(req.params.slug);
      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }
      res.json(product);
    } catch (error) {
      console.error("Error fetching product:", error);
      res.status(500).json({ error: "Failed to fetch product" });
    }
  });

  // Get categories
  app.get("/api/categories", async (req, res) => {
    try {
      const categories = await storage.getCategories();
      res.json(categories);
    } catch (error) {
      console.error("Error fetching categories:", error);
      res.status(500).json({ error: "Failed to fetch categories" });
    }
  });

  // Get cart items
  app.get("/api/cart", async (req, res) => {
    try {
      const sessionId = req.sessionID || "anonymous";
      const items = await storage.getCartItems(sessionId);
      res.json(items);
    } catch (error) {
      console.error("Error fetching cart:", error);
      res.status(500).json({ error: "Failed to fetch cart" });
    }
  });

  // Add to cart
  app.post("/api/cart", async (req, res) => {
    try {
      const sessionId = req.sessionID || "anonymous";
      
      const validation = addToCartSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          error: "Invalid request", 
          details: validation.error.errors 
        });
      }

      const { productId, quantity } = validation.data;

      const product = await storage.getProductById(productId);
      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }

      const item = await storage.addToCart({
        sessionId,
        productId,
        quantity,
      });
      res.json(item);
    } catch (error) {
      console.error("Error adding to cart:", error);
      res.status(500).json({ error: "Failed to add to cart" });
    }
  });

  // Update cart item quantity
  app.patch("/api/cart/:itemId", async (req, res) => {
    try {
      const validation = updateCartSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          error: "Invalid request", 
          details: validation.error.errors 
        });
      }

      const { quantity } = validation.data;

      const item = await storage.updateCartItemQuantity(req.params.itemId, quantity);
      if (!item) {
        return res.status(404).json({ error: "Cart item not found" });
      }
      res.json(item);
    } catch (error) {
      console.error("Error updating cart item:", error);
      res.status(500).json({ error: "Failed to update cart item" });
    }
  });

  // Remove from cart
  app.delete("/api/cart/:itemId", async (req, res) => {
    try {
      await storage.removeCartItem(req.params.itemId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error removing from cart:", error);
      res.status(500).json({ error: "Failed to remove from cart" });
    }
  });

  // Clear cart
  app.delete("/api/cart", async (req, res) => {
    try {
      const sessionId = req.sessionID || "anonymous";
      await storage.clearCart(sessionId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error clearing cart:", error);
      res.status(500).json({ error: "Failed to clear cart" });
    }
  });

  // Create order (public checkout endpoint)
  app.post("/api/orders", async (req, res) => {
    try {
      const { customerEmail, amount, status, paymentMethod, productIds, productTitles } = req.body;
      
      if (!customerEmail || !amount) {
        return res.status(400).json({ error: "Email and amount are required" });
      }

      const order = await storage.createOrder({
        customerEmail,
        amount,
        status: status || "paid",
        paymentMethod: paymentMethod || "card",
        productIds: productIds || [],
        productTitles: productTitles || [],
      });

      res.json(order);
    } catch (error) {
      console.error("Error creating order:", error);
      res.status(500).json({ error: "Failed to create order" });
    }
  });

  // Import products from WooCommerce CSV (admin-protected)
  app.post("/api/import-csv", requireAdmin, async (req, res) => {
    try {
      const csvPath = path.join(process.cwd(), "attached_assets/wc-product-export-5-2-2026-1770294821775_1770294931862.csv");
      const count = await importFromCsv(csvPath);
      res.json({ success: true, imported: count });
    } catch (error) {
      console.error("Error importing CSV:", error);
      res.status(500).json({ error: "Failed to import products from CSV" });
    }
  });

  // Import products from Shopify CSV (admin-protected)
  app.post("/api/import-shopify-csv", requireAdmin, async (req, res) => {
    try {
      const { importFromShopifyCsv } = await import("./shopifyParser");
      const csvPath = path.join(process.cwd(), "attached_assets/products_export_1770303278268.csv");
      const count = await importFromShopifyCsv(csvPath);
      res.json({ success: true, imported: count });
    } catch (error) {
      console.error("Error importing Shopify CSV:", error);
      res.status(500).json({ error: "Failed to import products from Shopify CSV" });
    }
  });

  // Contact form endpoint
  app.post("/api/contact", async (req, res) => {
    try {
      const contactSchema = z.object({
        name: z.string().min(1, "Name is required"),
        email: z.string().email("Valid email is required"),
        subject: z.string().min(1, "Subject is required"),
        message: z.string().min(10, "Message must be at least 10 characters"),
      });
      const validation = contactSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: validation.error.errors[0].message });
      }
      console.log("Contact form submission:", validation.data);
      res.json({ success: true, message: "Your message has been received. We'll respond within 24 hours." });
    } catch (error) {
      console.error("Error processing contact form:", error);
      res.status(500).json({ error: "Failed to send message" });
    }
  });

  // Sitemap.xml for SEO
  app.get("/sitemap.xml", async (req, res) => {
    try {
      const products = await storage.getAllProducts();
      const baseUrl = `${req.protocol}://${req.get("host")}`;
      
      let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
      xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
      
      xml += `  <url>\n    <loc>${baseUrl}/</loc>\n    <changefreq>daily</changefreq>\n    <priority>1.0</priority>\n  </url>\n`;
      xml += `  <url>\n    <loc>${baseUrl}/shop</loc>\n    <changefreq>daily</changefreq>\n    <priority>0.9</priority>\n  </url>\n`;
      xml += `  <url>\n    <loc>${baseUrl}/contact</loc>\n    <changefreq>monthly</changefreq>\n    <priority>0.6</priority>\n  </url>\n`;
      xml += `  <url>\n    <loc>${baseUrl}/privacy-policy</loc>\n    <changefreq>yearly</changefreq>\n    <priority>0.3</priority>\n  </url>\n`;
      xml += `  <url>\n    <loc>${baseUrl}/terms-conditions</loc>\n    <changefreq>yearly</changefreq>\n    <priority>0.3</priority>\n  </url>\n`;
      xml += `  <url>\n    <loc>${baseUrl}/refund-policy</loc>\n    <changefreq>yearly</changefreq>\n    <priority>0.3</priority>\n  </url>\n`;
      xml += `  <url>\n    <loc>${baseUrl}/shipping-policy</loc>\n    <changefreq>yearly</changefreq>\n    <priority>0.3</priority>\n  </url>\n`;
      
      for (const product of products) {
        xml += `  <url>\n    <loc>${baseUrl}/products/${product.slug}</loc>\n    <changefreq>weekly</changefreq>\n    <priority>0.8</priority>\n  </url>\n`;
      }
      
      xml += '</urlset>';
      
      res.set('Content-Type', 'application/xml');
      res.send(xml);
    } catch (error) {
      console.error("Error generating sitemap:", error);
      res.status(500).send("Error generating sitemap");
    }
  });

  // Google Shopping XML Product Feed
  app.get("/feed/google-shopping.xml", async (req, res) => {
    try {
      const products = await storage.getAllProducts();
      const baseUrl = `${req.protocol}://${req.get("host")}`;
      
      const escapeXml = (str: string | null | undefined): string => {
        if (!str) return "";
        return str
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;")
          .replace(/'/g, "&apos;");
      };

      const stripHtml = (str: string | null | undefined): string => {
        if (!str) return "";
        return str.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
      };

      let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
      xml += '<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">\n';
      xml += '<channel>\n';
      xml += `  <title>Testbankbooks - Test Banks &amp; Study Guides</title>\n`;
      xml += `  <link>${baseUrl}</link>\n`;
      xml += `  <description>Premium nursing test banks and study guides for exam preparation</description>\n`;
      
      for (const product of products) {
        const productPrice = product.salePrice && parseFloat(product.salePrice) < parseFloat(product.price)
          ? product.salePrice
          : product.price;
        const regularPrice = product.price;
        const hasSale = product.salePrice && parseFloat(product.salePrice) < parseFloat(product.price);
        
        const cleanDescription = stripHtml(product.description || product.title);
        const truncatedDescription = cleanDescription.substring(0, 5000);
        const cleanTitle = escapeXml(product.title).substring(0, 150);
        
        xml += '  <item>\n';
        xml += `    <g:id>${escapeXml(product.id.toString())}</g:id>\n`;
        xml += `    <g:title>${cleanTitle}</g:title>\n`;
        xml += `    <g:description>${escapeXml(truncatedDescription)}</g:description>\n`;
        xml += `    <g:link>${baseUrl}/products/${product.slug}</g:link>\n`;
        
        if (product.imageUrl) {
          xml += `    <g:image_link>${escapeXml(product.imageUrl)}</g:image_link>\n`;
        }
        
        if (product.additionalImages && Array.isArray(product.additionalImages) && product.additionalImages.length > 0) {
          for (const img of (product.additionalImages as string[]).slice(0, 10)) {
            xml += `    <g:additional_image_link>${escapeXml(img)}</g:additional_image_link>\n`;
          }
        }
        
        xml += `    <g:availability>${product.availability === "in_stock" ? "in_stock" : "out_of_stock"}</g:availability>\n`;
        xml += `    <g:price>${parseFloat(regularPrice).toFixed(2)} USD</g:price>\n`;
        
        if (hasSale) {
          xml += `    <g:sale_price>${parseFloat(product.salePrice!).toFixed(2)} USD</g:sale_price>\n`;
        }
        
        xml += `    <g:brand>${escapeXml(product.brand || "Testbankbooks")}</g:brand>\n`;
        xml += `    <g:condition>${product.condition || "new"}</g:condition>\n`;
        xml += `    <g:google_product_category>Media &gt; Books &gt; Non-Fiction Books &gt; Education Books</g:google_product_category>\n`;
        xml += `    <g:product_type>${escapeXml(product.category || "Educational Materials")}</g:product_type>\n`;
        xml += `    <g:identifier_exists>false</g:identifier_exists>\n`;
        
        xml += '  </item>\n';
      }
      
      xml += '</channel>\n';
      xml += '</rss>';
      
      res.set('Content-Type', 'application/xml');
      res.set('Content-Disposition', 'inline; filename="google-shopping-feed.xml"');
      res.send(xml);
    } catch (error) {
      console.error("Error generating Google Shopping feed:", error);
      res.status(500).send("Error generating feed");
    }
  });

  // Robots.txt
  app.get("/robots.txt", (req, res) => {
    const baseUrl = `${req.protocol}://${req.get("host")}`;
    const robotsTxt = `User-agent: *
Allow: /
Disallow: /admin
Disallow: /admin/*
Disallow: /checkout
Disallow: /thank-you
Disallow: /api/

Sitemap: ${baseUrl}/sitemap.xml
`;
    res.set('Content-Type', 'text/plain');
    res.send(robotsTxt);
  });

  // =====================
  // ADMIN ROUTES
  // =====================

  // Admin login
  app.post("/api/admin/login", async (req, res) => {
    try {
      const validation = adminLoginSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: "Invalid credentials" });
      }

      const { username, password } = validation.data;

      // Check if admin exists
      let admin = await storage.getAdminByUsername(username);
      
      // Create default admin if none exists
      if (!admin && username === "admin") {
        const hashedPassword = await bcrypt.hash("admin123", 10);
        admin = await storage.createAdminUser({ username: "admin", password: hashedPassword });
      }

      if (!admin) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const isValid = await bcrypt.compare(password, admin.password);
      if (!isValid) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      req.session.adminId = admin.id;
      req.session.adminUsername = admin.username;
      
      res.json({ success: true, username: admin.username });
    } catch (error) {
      console.error("Admin login error:", error);
      res.status(500).json({ error: "Login failed" });
    }
  });

  // Check admin session
  app.get("/api/admin/me", async (req, res) => {
    if (req.session.adminId) {
      res.json({ authenticated: true, username: req.session.adminUsername });
    } else {
      res.json({ authenticated: false });
    }
  });

  // Admin logout
  app.post("/api/admin/logout", (req, res) => {
    req.session.adminId = undefined;
    req.session.adminUsername = undefined;
    res.json({ success: true });
  });

  // Dashboard stats
  app.get("/api/admin/stats", requireAdmin, async (req, res) => {
    try {
      const stats = await storage.getDashboardStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ error: "Failed to fetch stats" });
    }
  });

  // Sales trend
  app.get("/api/admin/sales-trend", requireAdmin, async (req, res) => {
    try {
      const days = parseInt(req.query.days as string) || 30;
      const trend = await storage.getSalesTrend(days);
      res.json(trend);
    } catch (error) {
      console.error("Error fetching sales trend:", error);
      res.status(500).json({ error: "Failed to fetch sales trend" });
    }
  });

  // Orders
  app.get("/api/admin/orders", requireAdmin, async (req, res) => {
    try {
      const search = req.query.search as string;
      if (search) {
        const orders = await storage.getOrdersByEmail(search);
        return res.json(orders);
      }
      const orders = await storage.getAllOrders();
      res.json(orders);
    } catch (error) {
      console.error("Error fetching orders:", error);
      res.status(500).json({ error: "Failed to fetch orders" });
    }
  });

  // Create order (for testing)
  app.post("/api/admin/orders", requireAdmin, async (req, res) => {
    try {
      const order = await storage.createOrder(req.body);
      res.json(order);
    } catch (error) {
      console.error("Error creating order:", error);
      res.status(500).json({ error: "Failed to create order" });
    }
  });

  // Update order status
  app.patch("/api/admin/orders/:id", requireAdmin, async (req, res) => {
    try {
      const { status } = req.body;
      const order = await storage.updateOrderStatus(req.params.id as string, status);
      res.json(order);
    } catch (error) {
      console.error("Error updating order:", error);
      res.status(500).json({ error: "Failed to update order" });
    }
  });

  // Abandoned carts
  app.get("/api/admin/abandoned-carts", requireAdmin, async (req, res) => {
    try {
      const carts = await storage.getAllAbandonedCarts();
      res.json(carts);
    } catch (error) {
      console.error("Error fetching abandoned carts:", error);
      res.status(500).json({ error: "Failed to fetch abandoned carts" });
    }
  });

  // Send recovery email (mock)
  app.post("/api/admin/abandoned-carts/:id/send-recovery", requireAdmin, async (req, res) => {
    try {
      await storage.markRecoveryEmailSent(req.params.id as string);
      res.json({ success: true, message: "Recovery email sent (mock)" });
    } catch (error) {
      console.error("Error sending recovery email:", error);
      res.status(500).json({ error: "Failed to send recovery email" });
    }
  });

  // Update product
  app.patch("/api/admin/products/:id", requireAdmin, async (req, res) => {
    try {
      const validation = updateProductSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: "Invalid data", details: validation.error.errors });
      }
      const product = await storage.updateProduct(req.params.id as string, validation.data);
      res.json(product);
    } catch (error) {
      console.error("Error updating product:", error);
      res.status(500).json({ error: "Failed to update product" });
    }
  });

  // Bulk update products
  app.post("/api/admin/products/bulk-update", requireAdmin, async (req, res) => {
    try {
      const validation = bulkUpdateSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: "Invalid data", details: validation.error.errors });
      }
      await storage.bulkUpdateProducts(validation.data.ids, validation.data.updates);
      res.json({ success: true });
    } catch (error) {
      console.error("Error bulk updating products:", error);
      res.status(500).json({ error: "Failed to bulk update products" });
    }
  });

  const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

  app.post("/api/admin/products/import-csv", requireAdmin, upload.single("csvFile"), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No CSV file uploaded" });
      }

      const mode = (req.body?.mode === "merge" ? "merge" : "replace") as "replace" | "merge";
      const result = await importFromCsvBuffer(req.file.buffer, mode);
      res.json({ success: true, ...result });
    } catch (error) {
      console.error("Error importing CSV:", error);
      res.status(500).json({ error: "Failed to import products from CSV. Please check the file format." });
    }
  });

  // Tags
  app.get("/api/admin/tags", requireAdmin, async (req, res) => {
    try {
      const tags = await storage.getAllTags();
      res.json(tags);
    } catch (error) {
      console.error("Error fetching tags:", error);
      res.status(500).json({ error: "Failed to fetch tags" });
    }
  });

  app.post("/api/admin/tags", requireAdmin, async (req, res) => {
    try {
      const { name } = req.body;
      const tag = await storage.createTag({ name });
      res.json(tag);
    } catch (error) {
      console.error("Error creating tag:", error);
      res.status(500).json({ error: "Failed to create tag" });
    }
  });

  app.delete("/api/admin/tags/:id", requireAdmin, async (req, res) => {
    try {
      await storage.deleteTag(req.params.id as string);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting tag:", error);
      res.status(500).json({ error: "Failed to delete tag" });
    }
  });

  // Payment settings
  app.get("/api/admin/payment-settings", requireAdmin, async (req, res) => {
    try {
      const settings = await storage.getAllPaymentSettings();
      res.json(settings);
    } catch (error) {
      console.error("Error fetching payment settings:", error);
      res.status(500).json({ error: "Failed to fetch payment settings" });
    }
  });

  app.post("/api/admin/payment-settings", requireAdmin, async (req, res) => {
    try {
      const validation = paymentSettingSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: "Invalid data", details: validation.error.errors });
      }
      const setting = await storage.upsertPaymentSetting(validation.data);
      res.json(setting);
    } catch (error) {
      console.error("Error saving payment setting:", error);
      res.status(500).json({ error: "Failed to save payment setting" });
    }
  });

  // ============ DOWNLOAD & THANK YOU PAGE ROUTES ============

  // Get order details for Thank You page
  app.get("/api/orders/:id", async (req, res) => {
    try {
      const order = await storage.getOrderById(req.params.id as string);
      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }
      
      // Get products in order
      const productIds = order.productIds || [];
      const orderProducts = [];
      for (const productId of productIds) {
        const product = await storage.getProductById(productId);
        if (product) {
          orderProducts.push({
            id: product.id,
            title: product.title,
            price: product.price,
            imageUrl: product.imageUrl,
          });
        }
      }

      res.json({
        ...order,
        products: orderProducts,
      });
    } catch (error) {
      console.error("Error fetching order:", error);
      res.status(500).json({ error: "Failed to fetch order" });
    }
  });

  // Generate download token after payment verification
  app.post("/api/orders/:id/generate-download", async (req, res) => {
    try {
      const order = await storage.getOrderById(req.params.id as string);
      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }

      if (order.status !== "paid" && order.status !== "completed") {
        return res.status(403).json({ error: "Order not verified" });
      }

      const productIds = order.productIds || [];
      const tokens = [];

      for (const productId of productIds) {
        const product = await storage.getProductById(productId);
        if (!product) continue;

        const token = generateSecureToken();
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

        await storage.createDownloadToken({
          orderId: order.id,
          productId,
          token,
          expiresAt,
          downloadCount: 0,
          maxDownloads: 5,
        });

        const signedUrl = generateSignedUrl(token, expiresAt);
        tokens.push({
          productId,
          productTitle: product.title,
          downloadUrl: `/api/download/${signedUrl}`,
          expiresAt: expiresAt.toISOString(),
        });
      }

      res.json({ tokens });
    } catch (error) {
      console.error("Error generating download tokens:", error);
      res.status(500).json({ error: "Failed to generate download links" });
    }
  });

  // Secure download endpoint
  app.get("/api/download/:signedToken", async (req, res) => {
    try {
      const { signedToken } = req.params;
      const { valid, token } = verifySignedUrl(signedToken as string);

      if (!valid) {
        return res.status(403).json({ error: "Download link expired or invalid" });
      }

      const downloadToken = await storage.getDownloadToken(token);
      if (!downloadToken) {
        return res.status(404).json({ error: "Download token not found" });
      }

      if (new Date() > downloadToken.expiresAt) {
        return res.status(403).json({ error: "Download link has expired" });
      }

      if ((downloadToken.downloadCount ?? 0) >= (downloadToken.maxDownloads ?? 5)) {
        return res.status(403).json({ error: "Maximum downloads exceeded" });
      }

      const product = await storage.getProductById(downloadToken.productId);
      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }

      // Check for download path (local file)
      if (product.downloadPath) {
        await storage.incrementDownloadCount(token);
        // Redirect to the file or return the path for client-side handling
        res.json({
          success: true,
          downloadUrl: product.downloadPath,
          productTitle: product.title,
          remainingDownloads: (downloadToken.maxDownloads ?? 5) - (downloadToken.downloadCount ?? 0) - 1,
        });
        return;
      }

      // If no local path, try WooCommerce API
      const wooApi = createWooCommerceAPI();
      if (wooApi && product.wooProductId) {
        const files = await wooApi.getDownloadableFiles(product.wooProductId);
        if (files.length > 0) {
          await storage.incrementDownloadCount(token);
          res.json({
            success: true,
            downloadUrl: files[0].file,
            productTitle: product.title,
            remainingDownloads: (downloadToken.maxDownloads ?? 5) - (downloadToken.downloadCount ?? 0) - 1,
          });
          return;
        }
      }

      res.status(404).json({ error: "Download file not configured for this product" });
    } catch (error) {
      console.error("Error processing download:", error);
      res.status(500).json({ error: "Failed to process download" });
    }
  });

  // Admin: Get products without download paths
  app.get("/api/admin/products/missing-downloads", requireAdmin, async (req, res) => {
    try {
      const productsWithoutDownloads = await storage.getProductsWithoutDownloadPath();
      res.json(productsWithoutDownloads);
    } catch (error) {
      console.error("Error fetching products without downloads:", error);
      res.status(500).json({ error: "Failed to fetch products" });
    }
  });

  // Admin: Update single product download path
  app.patch("/api/admin/products/:id/download-path", requireAdmin, async (req, res) => {
    try {
      const { downloadPath } = req.body;
      if (!downloadPath || typeof downloadPath !== "string") {
        return res.status(400).json({ error: "Invalid download path" });
      }
      const product = await storage.updateProductDownloadPath(req.params.id as string, downloadPath);
      res.json(product);
    } catch (error) {
      console.error("Error updating download path:", error);
      res.status(500).json({ error: "Failed to update download path" });
    }
  });

  // Admin: Bulk update download paths
  app.post("/api/admin/products/bulk-download-paths", requireAdmin, async (req, res) => {
    try {
      const { updates } = req.body;
      if (!Array.isArray(updates)) {
        return res.status(400).json({ error: "Invalid updates format" });
      }
      await storage.bulkUpdateDownloadPaths(updates);
      res.json({ success: true, updated: updates.length });
    } catch (error) {
      console.error("Error bulk updating download paths:", error);
      res.status(500).json({ error: "Failed to bulk update download paths" });
    }
  });

  // WooCommerce sync endpoint (fetch download files from WooCommerce)
  app.post("/api/admin/sync-woocommerce-downloads", requireAdmin, async (req, res) => {
    try {
      const wooApi = createWooCommerceAPI();
      if (!wooApi) {
        return res.status(400).json({ error: "WooCommerce API not configured. Please set WC_URL, WC_KEY, and WC_SECRET." });
      }

      // Get all products with wooProductId
      const allProducts = await storage.getAllProducts();
      const productsToSync = allProducts.filter(p => p.wooProductId);
      
      const results = [];
      for (const product of productsToSync) {
        try {
          const files = await wooApi.getDownloadableFiles(product.wooProductId!);
          if (files.length > 0) {
            await storage.updateProductDownloadPath(product.id, files[0].file);
            results.push({ id: product.id, success: true, file: files[0].name });
          } else {
            results.push({ id: product.id, success: false, error: "No downloadable files" });
          }
        } catch (error) {
          results.push({ id: product.id, success: false, error: "API error" });
        }
      }

      res.json({ 
        synced: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        results 
      });
    } catch (error) {
      console.error("Error syncing WooCommerce downloads:", error);
      res.status(500).json({ error: "Failed to sync WooCommerce downloads" });
    }
  });

  // ========== CHAT ROUTES ==========
  
  // Get or create conversation for visitor
  app.post("/api/chat/conversation", async (req, res) => {
    try {
      const { visitorId, visitorName, visitorEmail } = req.body;
      
      if (!visitorId) {
        return res.status(400).json({ error: "Visitor ID is required" });
      }

      let conversation = await storage.getConversationByVisitorId(visitorId);
      
      if (!conversation) {
        conversation = await storage.createConversation({
          visitorId,
          visitorName: visitorName || null,
          visitorEmail: visitorEmail || null,
          status: "active",
        });
      }

      const messages = await storage.getMessagesByConversationId(conversation.id);
      res.json({ ...conversation, messages });
    } catch (error) {
      console.error("Error with chat conversation:", error);
      res.status(500).json({ error: "Failed to handle conversation" });
    }
  });

  // Send message (visitor)
  app.post("/api/chat/message", async (req, res) => {
    try {
      const { conversationId, message, senderType } = req.body;
      
      if (!conversationId || !message) {
        return res.status(400).json({ error: "Conversation ID and message are required" });
      }

      const newMessage = await storage.createMessage({
        conversationId,
        message,
        senderType: senderType || "visitor",
        isRead: false,
      });

      res.json(newMessage);
    } catch (error) {
      console.error("Error sending message:", error);
      res.status(500).json({ error: "Failed to send message" });
    }
  });

  // Get messages for a conversation
  app.get("/api/chat/messages/:conversationId", async (req, res) => {
    try {
      const messages = await storage.getMessagesByConversationId(req.params.conversationId);
      res.json(messages);
    } catch (error) {
      console.error("Error getting messages:", error);
      res.status(500).json({ error: "Failed to get messages" });
    }
  });

  // Mark admin messages as read (for visitor)
  app.post("/api/chat/mark-read/:conversationId", async (req, res) => {
    try {
      await storage.markMessagesAsRead(req.params.conversationId, "admin");
      res.json({ success: true });
    } catch (error) {
      console.error("Error marking messages as read:", error);
      res.status(500).json({ error: "Failed to mark messages as read" });
    }
  });

  // Admin: Get all conversations
  app.get("/api/admin/chat/conversations", requireAdmin, async (req, res) => {
    try {
      const conversations = await storage.getAllConversations();
      res.json(conversations);
    } catch (error) {
      console.error("Error getting conversations:", error);
      res.status(500).json({ error: "Failed to get conversations" });
    }
  });

  // Admin: Get single conversation with messages
  app.get("/api/admin/chat/conversations/:id", requireAdmin, async (req, res) => {
    try {
      const conversation = await storage.getConversationById(req.params.id);
      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }
      res.json(conversation);
    } catch (error) {
      console.error("Error getting conversation:", error);
      res.status(500).json({ error: "Failed to get conversation" });
    }
  });

  // Admin: Send message
  app.post("/api/admin/chat/message", requireAdmin, async (req, res) => {
    try {
      const { conversationId, message } = req.body;
      
      if (!conversationId || !message) {
        return res.status(400).json({ error: "Conversation ID and message are required" });
      }

      const newMessage = await storage.createMessage({
        conversationId,
        message,
        senderType: "admin",
        isRead: false,
      });

      res.json(newMessage);
    } catch (error) {
      console.error("Error sending admin message:", error);
      res.status(500).json({ error: "Failed to send message" });
    }
  });

  // Admin: Mark messages as read
  app.post("/api/admin/chat/mark-read/:conversationId", requireAdmin, async (req, res) => {
    try {
      await storage.markMessagesAsRead(req.params.conversationId, "visitor");
      res.json({ success: true });
    } catch (error) {
      console.error("Error marking messages as read:", error);
      res.status(500).json({ error: "Failed to mark messages as read" });
    }
  });

  // Admin: Close conversation
  app.post("/api/admin/chat/close/:conversationId", requireAdmin, async (req, res) => {
    try {
      const updated = await storage.updateConversationStatus(req.params.conversationId, "closed");
      res.json(updated);
    } catch (error) {
      console.error("Error closing conversation:", error);
      res.status(500).json({ error: "Failed to close conversation" });
    }
  });

  // Admin: Get unread message count
  app.get("/api/admin/chat/unread-count", requireAdmin, async (req, res) => {
    try {
      const count = await storage.getUnreadMessageCount();
      res.json({ count });
    } catch (error) {
      console.error("Error getting unread count:", error);
      res.status(500).json({ error: "Failed to get unread count" });
    }
  });

  return httpServer;
}
