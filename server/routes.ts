import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { importFromCsv } from "./csvParser";
import { z } from "zod";
import path from "path";

const addToCartSchema = z.object({
  productId: z.string().min(1, "Product ID is required"),
  quantity: z.number().int().positive().default(1),
});

const updateCartSchema = z.object({
  quantity: z.number().int().positive("Quantity must be a positive integer"),
});

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
      
      // Home page
      xml += `  <url>\n    <loc>${baseUrl}/</loc>\n    <priority>1.0</priority>\n  </url>\n`;
      
      // Cart and Checkout pages
      xml += `  <url>\n    <loc>${baseUrl}/cart</loc>\n    <priority>0.5</priority>\n  </url>\n`;
      xml += `  <url>\n    <loc>${baseUrl}/checkout</loc>\n    <priority>0.5</priority>\n  </url>\n`;
      
      // Product pages
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

  return httpServer;
}
