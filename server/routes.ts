import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { importFromCsv } from "./csvParser";
import { z } from "zod";
import path from "path";
import bcrypt from "bcryptjs";

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

  // Import products from WooCommerce CSV
  app.post("/api/import-csv", async (req, res) => {
    try {
      const csvPath = path.join(process.cwd(), "attached_assets/wc-product-export-5-2-2026-1770294821775_1770294931862.csv");
      const count = await importFromCsv(csvPath);
      res.json({ success: true, imported: count });
    } catch (error) {
      console.error("Error importing CSV:", error);
      res.status(500).json({ error: "Failed to import products from CSV" });
    }
  });

  // Sitemap.xml for SEO
  app.get("/sitemap.xml", async (req, res) => {
    try {
      const products = await storage.getAllProducts();
      const baseUrl = `${req.protocol}://${req.get("host")}`;
      
      let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
      xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
      
      xml += `  <url>\n    <loc>${baseUrl}/</loc>\n    <priority>1.0</priority>\n  </url>\n`;
      xml += `  <url>\n    <loc>${baseUrl}/shop</loc>\n    <priority>0.9</priority>\n  </url>\n`;
      xml += `  <url>\n    <loc>${baseUrl}/cart</loc>\n    <priority>0.5</priority>\n  </url>\n`;
      xml += `  <url>\n    <loc>${baseUrl}/checkout</loc>\n    <priority>0.5</priority>\n  </url>\n`;
      
      for (const product of products) {
        xml += `  <url>\n    <loc>${baseUrl}/products/${product.slug}</loc>\n    <priority>0.8</priority>\n  </url>\n`;
      }
      
      xml += '</urlset>';
      
      res.set('Content-Type', 'application/xml');
      res.send(xml);
    } catch (error) {
      console.error("Error generating sitemap:", error);
      res.status(500).send("Error generating sitemap");
    }
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

  return httpServer;
}
