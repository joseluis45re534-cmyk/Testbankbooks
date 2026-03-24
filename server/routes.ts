import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { importFromCsv, importFromCsvBuffer } from "./csvParser";
import { generateSecureToken, generateSignedUrl, verifySignedUrl, createWooCommerceAPI } from "./woocommerce";
import { z } from "zod";
import path from "path";
import fs from "fs";
import bcrypt from "bcryptjs";
import multer from "multer";
import { createPaypalOrder, capturePaypalOrderDirect, loadPaypalDefault } from "./paypal";
import { createStripePaymentIntent, getStripeInstance, getStripePublishableKey } from "./stripe";
import { sendOrderConfirmationEmail, sendAbandonedCartRecoveryEmail } from "./email";
import { db } from "./db";
import { cartItems, abandonedCarts, siteSettings, chatConversations } from "@shared/schema";
import { eq, or } from "drizzle-orm";
import { triggerManualRun } from "./scheduler";
import { generateBlogPostForProduct } from "./blogGenerator";
import { startBulkImageDownload, getDownloadProgress, startBulkFileDownload, getFileDownloadProgress, saveUploadedImage, saveUploadedDownload } from "./mediaDownloader";

declare module 'express-session' {
  interface SessionData {
    adminId?: string;
    adminUsername?: string;
    cartActive?: boolean;
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
  
  // PayPal integration routes
  app.get("/paypal/setup", async (req, res) => {
    await loadPaypalDefault(req, res);
  });

  app.post("/paypal/order", async (req, res) => {
    try {
      const sessionId = req.sessionID;
      const cartItems = await storage.getCartItems(sessionId);
      if (!cartItems || cartItems.length === 0) {
        return res.status(400).json({ error: "Cart is empty" });
      }

      let total = 0;
      for (const item of cartItems) {
        const product = item.product;
        if (!product) continue;
        const price = product.salePrice ? parseFloat(product.salePrice) : parseFloat(product.price);
        total += price * item.quantity;
      }

      req.body.amount = total.toFixed(2);
      req.body.currency = "USD";
      req.body.intent = "CAPTURE";

      await createPaypalOrder(req, res);
    } catch (error) {
      console.error("PayPal order error:", error);
      res.status(500).json({ error: "Failed to create PayPal order" });
    }
  });

  app.post("/paypal/order/:orderID/capture", async (req, res) => {
    try {
      const { customerEmail, customerName, phone } = req.body;
      const sessionId = req.sessionID;

      const cartItemsList = await storage.getCartItems(sessionId);
      if (!cartItemsList || cartItemsList.length === 0) {
        return res.status(400).json({ error: "Cart is empty" });
      }

      let serverTotal = 0;
      const productIds: string[] = [];
      const productTitles: string[] = [];
      const savedName = customerName || cartItemsList[0]?.customerName || null;
      const savedPhone = phone || cartItemsList[0]?.phone || null;
      for (const item of cartItemsList) {
        const product = item.product;
        if (!product) continue;
        const price = product.salePrice ? parseFloat(product.salePrice) : parseFloat(product.price);
        serverTotal += price * item.quantity;
        productIds.push(String(product.id));
        productTitles.push(product.title);
      }

      const captureResult = await capturePaypalOrderDirect(req.params.orderID);

      if (captureResult.httpStatusCode >= 400) {
        return res.status(captureResult.httpStatusCode).json(captureResult.jsonResponse);
      }

      if (captureResult.jsonResponse.status !== "COMPLETED") {
        return res.status(400).json({ error: "Payment not completed", details: captureResult.jsonResponse });
      }

      const capturedAmount = captureResult.jsonResponse.purchase_units?.[0]?.payments?.captures?.[0]?.amount?.value;
      if (capturedAmount && Math.abs(parseFloat(capturedAmount) - serverTotal) > 0.01) {
        console.error(`Amount mismatch: PayPal=${capturedAmount}, Server=${serverTotal.toFixed(2)}`);
        return res.status(400).json({ error: "Payment amount mismatch" });
      }

      const order = await storage.createOrder({
        customerEmail: customerEmail || "unknown@email.com",
        customerName: savedName,
        phone: savedPhone,
        amount: capturedAmount || serverTotal.toFixed(2),
        status: "paid",
        paymentMethod: "paypal",
        productIds,
        productTitles,
      });

      await storage.clearCart(sessionId);

      sendOrderConfirmationEmail({
        customerEmail: order.customerEmail,
        customerName: order.customerName || null,
        orderId: order.id,
        amount: order.amount,
        paymentMethod: "paypal",
        productTitles,
      }).catch(err => console.error("Failed to send order email:", err));

      res.json({
        ...captureResult.jsonResponse,
        internalOrder: order,
      });
    } catch (error) {
      console.error("PayPal capture error:", error);
      res.status(500).json({ error: "Failed to capture PayPal order" });
    }
  });

  // Stripe integration routes
  app.get("/api/stripe/config", async (req, res) => {
    try {
      const publishableKey = await getStripePublishableKey();
      res.json({ publishableKey });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Stripe not configured" });
    }
  });

  app.post("/api/stripe/create-payment-intent", async (req, res) => {
    try {
      const sessionId = req.sessionID;
      const { customerEmail } = req.body;

      const cartItems = await storage.getCartItems(sessionId);
      if (!cartItems || cartItems.length === 0) {
        return res.status(400).json({ error: "Cart is empty" });
      }

      let total = 0;
      const productIds: string[] = [];
      const productTitles: string[] = [];
      for (const item of cartItems) {
        const product = item.product;
        if (!product) continue;
        const price = product.salePrice ? parseFloat(product.salePrice) : parseFloat(product.price);
        total += price * item.quantity;
        productIds.push(String(product.id));
        productTitles.push(product.title);
      }

      const paymentIntent = await createStripePaymentIntent(total, "usd", {
        customerEmail: customerEmail || "",
        sessionId,
        productIds: productIds.join(","),
      });

      res.json({
        clientSecret: paymentIntent.client_secret,
        amount: total.toFixed(2),
      });
    } catch (error) {
      console.error("Stripe payment intent error:", error);
      res.status(500).json({ error: "Failed to create payment intent" });
    }
  });

  app.post("/api/stripe/confirm-payment", async (req, res) => {
    try {
      const { paymentIntentId, customerEmail, customerName, phone } = req.body;
      const sessionId = req.sessionID;

      if (!paymentIntentId) {
        return res.status(400).json({ error: "Payment intent ID required" });
      }

      const stripeInstance = await getStripeInstance();
      const paymentIntent = await stripeInstance.paymentIntents.retrieve(paymentIntentId);

      if (paymentIntent.status !== "succeeded") {
        return res.status(400).json({ error: "Payment not completed", status: paymentIntent.status });
      }

      if (paymentIntent.metadata.sessionId !== sessionId) {
        console.error(`Session mismatch: PI=${paymentIntent.metadata.sessionId}, Current=${sessionId}`);
        return res.status(403).json({ error: "Payment session mismatch" });
      }

      const cartItemsList = await storage.getCartItems(sessionId);
      if (!cartItemsList || cartItemsList.length === 0) {
        return res.status(400).json({ error: "Cart is empty" });
      }

      let serverTotal = 0;
      const productIds: string[] = [];
      const productTitles: string[] = [];
      const savedName = customerName || cartItemsList[0]?.customerName || null;
      const savedPhone = phone || cartItemsList[0]?.phone || null;
      for (const item of cartItemsList) {
        const product = item.product;
        if (!product) continue;
        const price = product.salePrice ? parseFloat(product.salePrice) : parseFloat(product.price);
        serverTotal += price * item.quantity;
        productIds.push(String(product.id));
        productTitles.push(product.title);
      }

      const piProductIds = paymentIntent.metadata.productIds?.split(",") || [];
      if (piProductIds.length !== productIds.length || !piProductIds.every((id: string) => productIds.includes(id))) {
        console.error(`Product mismatch: PI=${piProductIds}, Cart=${productIds}`);
        return res.status(400).json({ error: "Cart contents changed since payment" });
      }

      const paidAmount = paymentIntent.amount / 100;
      if (Math.abs(paidAmount - serverTotal) > 0.01) {
        console.error(`Amount mismatch: Stripe=${paidAmount}, Server=${serverTotal.toFixed(2)}`);
        return res.status(400).json({ error: "Payment amount mismatch" });
      }

      const order = await storage.createOrder({
        customerEmail: customerEmail || "unknown@email.com",
        customerName: savedName,
        phone: savedPhone,
        amount: paidAmount.toFixed(2),
        status: "paid",
        paymentMethod: "stripe",
        productIds,
        productTitles,
      });

      await storage.clearCart(sessionId);

      sendOrderConfirmationEmail({
        customerEmail: order.customerEmail,
        customerName: order.customerName || null,
        orderId: order.id,
        amount: order.amount,
        paymentMethod: "stripe",
        productTitles,
      }).catch(err => console.error("Failed to send order email:", err));

      res.json({ success: true, order });
    } catch (error) {
      console.error("Stripe confirm error:", error);
      res.status(500).json({ error: "Failed to confirm payment" });
    }
  });

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

  // Get product by numeric/string ID
  app.get("/api/products/id/:id", async (req, res) => {
    try {
      const product = await storage.getProductById(req.params.id);
      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }
      res.json(product);
    } catch (error) {
      console.error("Error fetching product by id:", error);
      res.status(500).json({ error: "Failed to fetch product" });
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

      req.session.cartActive = true;
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

  // Create order (admin only - public orders are created via PayPal capture flow)
  app.post("/api/orders", requireAdmin, async (req, res) => {
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

  // Google Merchant Center Shopping Feed (RSS 2.0 with g: namespace)
  // Spec: https://support.google.com/merchants/answer/7052112
  app.get("/feed/google-shopping.xml", async (req, res) => {
    try {
      const allProducts = await storage.getAllProducts();
      const baseUrl = `${req.protocol}://${req.get("host")}`;

      function esc(str: string | null | undefined): string {
        if (!str) return "";
        return str
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;");
      }

      function absUrl(url: string | null | undefined): string {
        if (!url) return "";
        if (url.startsWith("http")) return url;
        return `${baseUrl}${url}`;
      }

      // Build a meaningful description for products that only have a thin one
      function buildDescription(title: string, desc: string | null | undefined, category: string | null | undefined): string {
        const existing = (desc || "").trim();
        // Use existing if it's meaningfully different from the title and long enough
        if (existing.length > 120 && existing.toLowerCase() !== title.toLowerCase().trim()) {
          return existing.substring(0, 5000);
        }
        // Generate a rich fallback description
        const cat = category || "Nursing";
        return `${title} - Comprehensive test bank providing nursing and healthcare students with extensive practice questions and detailed answer explanations. Designed to accompany the corresponding textbook, this resource covers all key topics in ${cat} and helps students master course content, sharpen clinical reasoning, and confidently prepare for exams including the NCLEX. Includes multiple-choice questions, scenario-based items, and fully explained answers aligned with the latest edition. Instant digital download - available immediately after purchase. No shipping, no waiting. Perfect for students who want thorough exam preparation and deeper understanding of ${cat} concepts.`;
      }

      let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
      xml += '<rss xmlns:g="http://base.google.com/ns/1.0" version="2.0">\n';
      xml += "  <channel>\n";
      xml += `    <title>Testbankbooks - Nursing Test Banks &amp; Study Guides</title>\n`;
      xml += `    <link>${esc(baseUrl)}</link>\n`;
      xml += `    <description>Premium nursing test banks and study guides for exam preparation. Instant digital download. 300+ titles available.</description>\n`;

      for (const p of allProducts) {
        if (!p.imageUrl) continue;

        const price = parseFloat(p.price);
        const salePrice = p.salePrice ? parseFloat(p.salePrice) : null;
        const imageUrl = absUrl(p.imageUrl);
        const productUrl = `${baseUrl}/products/${p.slug}`;
        const availability = p.availability === "in_stock" ? "in stock" : "out of stock";

        // Title: 150-char max per GMC spec
        const title = (p.title || "").substring(0, 150);

        // Description: use seo desc > rich desc > generated fallback
        const description = buildDescription(title, p.seoDescription || p.description, p.category);

        // MPN: use product ID as merchant-assigned product number
        const mpn = `TBB-${p.id}`;

        // Custom label for campaign segmentation
        const customLabel = p.category || "Test Banks";

        xml += "    <item>\n";

        // ── Required fields ──────────────────────────────────────────────
        xml += `      <g:id>${esc(p.id)}</g:id>\n`;
        xml += `      <g:title>${esc(title)}</g:title>\n`;
        xml += `      <g:description>${esc(description)}</g:description>\n`;
        xml += `      <g:link>${esc(productUrl)}</g:link>\n`;
        xml += `      <g:image_link>${esc(imageUrl)}</g:image_link>\n`;
        xml += `      <g:availability>${availability}</g:availability>\n`;
        xml += `      <g:price>${price.toFixed(2)} USD</g:price>\n`;
        xml += `      <g:condition>new</g:condition>\n`;

        // ── Pricing ──────────────────────────────────────────────────────
        if (salePrice !== null && salePrice < price) {
          xml += `      <g:sale_price>${salePrice.toFixed(2)} USD</g:sale_price>\n`;
        }

        // ── Identity ─────────────────────────────────────────────────────
        xml += `      <g:brand>${esc(p.brand || "Testbankbooks")}</g:brand>\n`;
        xml += `      <g:mpn>${esc(mpn)}</g:mpn>\n`;
        xml += `      <g:identifier_exists>no</g:identifier_exists>\n`;

        // ── Categorisation ───────────────────────────────────────────────
        // 783 = Software > Educational Software (Google product taxonomy)
        xml += `      <g:google_product_category>783</g:google_product_category>\n`;
        xml += `      <g:product_type>Test Banks &gt; ${esc(p.category || "Nursing")}</g:product_type>\n`;

        // ── Shipping: free digital delivery ──────────────────────────────
        xml += `      <g:shipping>\n`;
        xml += `        <g:country>US</g:country>\n`;
        xml += `        <g:service>Digital Delivery</g:service>\n`;
        xml += `        <g:price>0.00 USD</g:price>\n`;
        xml += `      </g:shipping>\n`;
        xml += `      <g:shipping>\n`;
        xml += `        <g:country>GB</g:country>\n`;
        xml += `        <g:service>Digital Delivery</g:service>\n`;
        xml += `        <g:price>0.00 USD</g:price>\n`;
        xml += `      </g:shipping>\n`;
        xml += `      <g:shipping>\n`;
        xml += `        <g:country>CA</g:country>\n`;
        xml += `        <g:service>Digital Delivery</g:service>\n`;
        xml += `        <g:price>0.00 USD</g:price>\n`;
        xml += `      </g:shipping>\n`;
        xml += `      <g:shipping>\n`;
        xml += `        <g:country>AU</g:country>\n`;
        xml += `        <g:service>Digital Delivery</g:service>\n`;
        xml += `        <g:price>0.00 USD</g:price>\n`;
        xml += `      </g:shipping>\n`;

        // ── Campaign labels ──────────────────────────────────────────────
        xml += `      <g:custom_label_0>${esc(customLabel)}</g:custom_label_0>\n`;
        if (salePrice !== null && salePrice < price) {
          xml += `      <g:custom_label_1>on-sale</g:custom_label_1>\n`;
        }

        // ── Additional images (up to 9) ──────────────────────────────────
        const additional = (p.additionalImages || []).slice(0, 9);
        for (const img of additional) {
          const imgAbs = absUrl(img);
          if (imgAbs) xml += `      <g:additional_image_link>${esc(imgAbs)}</g:additional_image_link>\n`;
        }

        xml += "    </item>\n";
      }

      xml += "  </channel>\n";
      xml += "</rss>\n";

      res.set("Content-Type", "application/xml; charset=utf-8");
      res.send(xml);
    } catch (error) {
      console.error("Error generating Google Shopping feed:", error);
      res.status(500).send("Error generating feed");
    }
  });

  // Product XML feed — full catalog export
  app.get("/feed/products.xml", async (req, res) => {
    try {
      const allProducts = await storage.getAllProducts();
      const baseUrl = `${req.protocol}://${req.get("host")}`;

      function escXml(str: string | null | undefined): string {
        if (!str) return "";
        return str
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;")
          .replace(/'/g, "&apos;");
      }

      function absUrl(url: string | null | undefined): string {
        if (!url) return "";
        if (url.startsWith("http")) return url;
        return `${baseUrl}${url}`;
      }

      let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
      xml += `<products total="${allProducts.length}" generated="${new Date().toISOString()}">\n`;

      for (const p of allProducts) {
        const displayPrice = p.salePrice || p.price;
        const additionalImages = (p.additionalImages || []).map(absUrl).filter(Boolean);

        xml += "  <product>\n";
        xml += `    <id>${escXml(p.id)}</id>\n`;
        xml += `    <title>${escXml(p.title)}</title>\n`;
        xml += `    <description>${escXml(p.description || "")}</description>\n`;
        xml += `    <price>${escXml(p.price)}</price>\n`;
        xml += `    <sale_price>${escXml(p.salePrice || "")}</sale_price>\n`;
        xml += `    <display_price>${escXml(String(displayPrice))}</display_price>\n`;
        xml += `    <category>${escXml(p.category || "")}</category>\n`;
        xml += `    <brand>${escXml(p.brand || "Testbankbooks")}</brand>\n`;
        xml += `    <availability>${escXml(p.availability || "in_stock")}</availability>\n`;
        xml += `    <slug>${escXml(p.slug || "")}</slug>\n`;
        xml += `    <url>${escXml(`${baseUrl}/products/${p.slug}`)}</url>\n`;
        xml += `    <image>${escXml(absUrl(p.imageUrl))}</image>\n`;
        if (additionalImages.length > 0) {
          xml += "    <additional_images>\n";
          for (const img of additionalImages) {
            xml += `      <image>${escXml(img)}</image>\n`;
          }
          xml += "    </additional_images>\n";
        }
        xml += `    <seo_title>${escXml(p.seoTitle || "")}</seo_title>\n`;
        xml += `    <seo_description>${escXml(p.seoDescription || "")}</seo_description>\n`;
        if (p.tags && p.tags.length > 0) {
          xml += "    <tags>\n";
          for (const tag of p.tags) {
            xml += `      <tag>${escXml(tag)}</tag>\n`;
          }
          xml += "    </tags>\n";
        }
        xml += "  </product>\n";
      }

      xml += "</products>\n";

      res.set("Content-Type", "application/xml; charset=utf-8");
      res.set("Content-Disposition", `attachment; filename="products-${new Date().toISOString().split("T")[0]}.xml"`);
      res.send(xml);
    } catch (error) {
      console.error("Error generating product XML:", error);
      res.status(500).send("Error generating product XML");
    }
  });

  // Sitemap.xml for SEO
  app.get("/sitemap.xml", async (req, res) => {
    try {
      const products = await storage.getAllProducts();
      const blogPostsList = await storage.getPublishedBlogPosts();
      const baseUrl = `${req.protocol}://${req.get("host")}`;
      
      let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
      xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
      
      xml += `  <url>\n    <loc>${baseUrl}/</loc>\n    <changefreq>daily</changefreq>\n    <priority>1.0</priority>\n  </url>\n`;
      xml += `  <url>\n    <loc>${baseUrl}/shop</loc>\n    <changefreq>daily</changefreq>\n    <priority>0.9</priority>\n  </url>\n`;
      xml += `  <url>\n    <loc>${baseUrl}/blog</loc>\n    <changefreq>daily</changefreq>\n    <priority>0.8</priority>\n  </url>\n`;
      xml += `  <url>\n    <loc>${baseUrl}/about</loc>\n    <changefreq>monthly</changefreq>\n    <priority>0.7</priority>\n  </url>\n`;
      xml += `  <url>\n    <loc>${baseUrl}/contact</loc>\n    <changefreq>monthly</changefreq>\n    <priority>0.6</priority>\n  </url>\n`;
      xml += `  <url>\n    <loc>${baseUrl}/privacy-policy</loc>\n    <changefreq>yearly</changefreq>\n    <priority>0.3</priority>\n  </url>\n`;
      xml += `  <url>\n    <loc>${baseUrl}/terms-conditions</loc>\n    <changefreq>yearly</changefreq>\n    <priority>0.3</priority>\n  </url>\n`;
      xml += `  <url>\n    <loc>${baseUrl}/refund-policy</loc>\n    <changefreq>yearly</changefreq>\n    <priority>0.3</priority>\n  </url>\n`;
      xml += `  <url>\n    <loc>${baseUrl}/shipping-policy</loc>\n    <changefreq>yearly</changefreq>\n    <priority>0.3</priority>\n  </url>\n`;
      
      for (const product of products) {
        xml += `  <url>\n    <loc>${baseUrl}/products/${product.slug}</loc>\n    <changefreq>weekly</changefreq>\n    <priority>0.8</priority>\n  </url>\n`;
      }

      for (const post of blogPostsList) {
        xml += `  <url>\n    <loc>${baseUrl}/blog/${post.slug}</loc>\n    <changefreq>monthly</changefreq>\n    <priority>0.7</priority>\n  </url>\n`;
      }
      
      xml += '</urlset>';
      
      res.set('Content-Type', 'application/xml');
      res.send(xml);
    } catch (error) {
      console.error("Error generating sitemap:", error);
      res.status(500).send("Error generating sitemap");
    }
  });


  // Robots.txt
  app.get("/robots.txt", (req, res) => {
    const baseUrl = `${req.protocol}://${req.get("host")}`;
    const robotsTxt = `User-agent: Googlebot
Allow: /
Disallow: /admin
Disallow: /admin/*
Disallow: /checkout
Disallow: /thank-you
Disallow: /api/

User-agent: *
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
      
      req.session.save((err) => {
        if (err) {
          console.error("Session save error:", err);
          return res.status(500).json({ error: "Session save failed" });
        }
        res.json({ success: true, username: admin!.username });
      });
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
      await storage.detectAndRecordAbandonedCarts(60);
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

  app.post("/api/cart/email", async (req, res) => {
    try {
      const sessionId = req.sessionID;
      const { email, customerName, phone } = req.body;
      if (!email) return res.status(400).json({ error: "Email required" });
      const updateData: any = { email };
      if (customerName) updateData.customerName = customerName;
      if (phone) updateData.phone = phone;
      await db.update(cartItems)
        .set(updateData)
        .where(eq(cartItems.sessionId, sessionId));
      const abandonedUpdate: any = { email };
      if (customerName) abandonedUpdate.customerName = customerName;
      if (phone) abandonedUpdate.phone = phone;
      await db.update(abandonedCarts)
        .set(abandonedUpdate)
        .where(eq(abandonedCarts.sessionId, sessionId));
      res.json({ success: true });
    } catch (error) {
      console.error("Error saving cart email:", error);
      res.status(500).json({ error: "Failed to save email" });
    }
  });

  // Abandoned carts - detect fresh ones on each request
  app.get("/api/admin/abandoned-carts", requireAdmin, async (req, res) => {
    try {
      await storage.detectAndRecordAbandonedCarts(60);
      const carts = await storage.getAllAbandonedCarts();
      res.json(carts);
    } catch (error) {
      console.error("Error fetching abandoned carts:", error);
      res.status(500).json({ error: "Failed to fetch abandoned carts" });
    }
  });

  app.post("/api/admin/abandoned-carts/:id/send-recovery", requireAdmin, async (req, res) => {
    try {
      const allCarts = await storage.getAllAbandonedCarts();
      const cart = allCarts.find(c => c.id === req.params.id);
      
      if (!cart) {
        return res.status(404).json({ error: "Abandoned cart not found" });
      }

      if (!cart.email) {
        return res.status(400).json({ error: "No email address available for this cart" });
      }

      await sendAbandonedCartRecoveryEmail({
        customerEmail: cart.email,
        customerName: cart.customerName || null,
        productTitles: cart.productTitles || [],
        totalAmount: cart.totalAmount,
      });

      await storage.markRecoveryEmailSent(req.params.id as string);
      res.json({ success: true, message: "Recovery email sent successfully" });
    } catch (error: any) {
      console.error("Error sending recovery email:", error);
      const message = error?.message?.includes("verify a domain")
        ? "You need to verify your domain at resend.com/domains before sending emails to customers. Currently you can only send to your own email."
        : error?.message || "Failed to send recovery email";
      res.status(500).json({ error: message });
    }
  });

  app.get("/api/site-settings/custom-html", async (_req, res) => {
    try {
      const results = await db.select().from(siteSettings)
        .where(
          or(
            eq(siteSettings.key, "headerHtml"),
            eq(siteSettings.key, "bodyHtml"),
            eq(siteSettings.key, "footerHtml")
          )
        );
      const settings: Record<string, string> = {};
      for (const row of results) {
        settings[row.key] = row.value || "";
      }
      res.json(settings);
    } catch (error) {
      console.error("Error fetching custom HTML settings:", error);
      res.status(500).json({ error: "Failed to fetch settings" });
    }
  });

  app.post("/api/admin/site-settings/custom-html", requireAdmin, async (req, res) => {
    try {
      const { headerHtml, bodyHtml, footerHtml } = req.body;
      const entries = [
        { key: "headerHtml", value: headerHtml || "" },
        { key: "bodyHtml", value: bodyHtml || "" },
        { key: "footerHtml", value: footerHtml || "" },
      ];
      for (const entry of entries) {
        await db.insert(siteSettings)
          .values({ key: entry.key, value: entry.value })
          .onConflictDoUpdate({
            target: siteSettings.key,
            set: { value: entry.value, updatedAt: new Date() },
          });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error saving custom HTML settings:", error);
      res.status(500).json({ error: "Failed to save settings" });
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
      } else if (visitorName || visitorEmail) {
        const updates: Record<string, string> = {};
        if (visitorName) updates.visitorName = visitorName;
        if (visitorEmail) updates.visitorEmail = visitorEmail;
        await db.update(chatConversations).set(updates).where(eq(chatConversations.id, conversation.id));
        conversation = { ...conversation, ...updates };
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
      const conversation = await storage.getConversationById(req.params.id as string);
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
      await storage.markMessagesAsRead(req.params.conversationId as string, "visitor");
      res.json({ success: true });
    } catch (error) {
      console.error("Error marking messages as read:", error);
      res.status(500).json({ error: "Failed to mark messages as read" });
    }
  });

  // Admin: Close conversation
  app.post("/api/admin/chat/close/:conversationId", requireAdmin, async (req, res) => {
    try {
      const updated = await storage.updateConversationStatus(req.params.conversationId as string, "closed");
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

  // =====================
  // BLOG ROUTES
  // =====================

  // Get all published blog posts (with optional category filter)
  app.get("/api/blog", async (req, res) => {
    try {
      const category = req.query.category as string | undefined;
      const posts = await storage.getPublishedBlogPosts(category);
      res.json(posts);
    } catch (error) {
      console.error("Error fetching blog posts:", error);
      res.status(500).json({ error: "Failed to fetch blog posts" });
    }
  });

  // Get blog categories
  app.get("/api/blog/categories", async (req, res) => {
    try {
      const categories = await storage.getBlogCategories();
      res.json(categories);
    } catch (error) {
      console.error("Error fetching blog categories:", error);
      res.status(500).json({ error: "Failed to fetch categories" });
    }
  });

  // Get blog post by product ID (for linking from product pages)
  app.get("/api/blog/by-product/:productId", async (req, res) => {
    try {
      const post = await storage.getBlogPostByProductId(req.params.productId as string);
      if (!post || !post.published) {
        return res.status(404).json({ error: "Blog post not found" });
      }
      res.json(post);
    } catch (error) {
      console.error("Error fetching blog post by product:", error);
      res.status(500).json({ error: "Failed to fetch blog post" });
    }
  });

  // Get single blog post by slug
  app.get("/api/blog/:slug", async (req, res) => {
    try {
      const post = await storage.getBlogPostBySlug(req.params.slug);
      if (!post || !post.published) {
        return res.status(404).json({ error: "Blog post not found" });
      }
      res.json(post);
    } catch (error) {
      console.error("Error fetching blog post:", error);
      res.status(500).json({ error: "Failed to fetch blog post" });
    }
  });

  // Admin: Get all blog posts (including unpublished)
  app.get("/api/admin/blog", requireAdmin, async (req, res) => {
    try {
      const posts = await storage.getAllBlogPosts();
      res.json(posts);
    } catch (error) {
      console.error("Error fetching blog posts:", error);
      res.status(500).json({ error: "Failed to fetch blog posts" });
    }
  });

  // Admin: Create blog post
  app.post("/api/admin/blog", requireAdmin, async (req, res) => {
    try {
      const post = await storage.createBlogPost(req.body);
      res.json(post);
    } catch (error) {
      console.error("Error creating blog post:", error);
      res.status(500).json({ error: "Failed to create blog post" });
    }
  });

  // Admin: Update blog post
  app.patch("/api/admin/blog/:id", requireAdmin, async (req, res) => {
    try {
      const post = await storage.updateBlogPost(req.params.id as string, req.body);
      res.json(post);
    } catch (error) {
      console.error("Error updating blog post:", error);
      res.status(500).json({ error: "Failed to update blog post" });
    }
  });

  // Admin: Delete blog post
  app.delete("/api/admin/blog/:id", requireAdmin, async (req, res) => {
    try {
      await storage.deleteBlogPost(req.params.id as string);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting blog post:", error);
      res.status(500).json({ error: "Failed to delete blog post" });
    }
  });

  // Admin: Auto-generate blog post for a single product
  app.post("/api/admin/blog/generate/:productId", requireAdmin, async (req, res) => {
    try {
      const product = await storage.getProductById(req.params.productId as string);
      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }
      const existing = await storage.getBlogPostByProductId(product.id);
      if (existing) {
        return res.json({ success: true, post: existing, alreadyExists: true });
      }
      const generated = generateBlogPostForProduct(product);
      const post = await storage.createBlogPost({
        ...generated,
        productId: product.id,
        imageUrl: product.imageUrl || null,
        published: true,
      });
      res.json({ success: true, post });
    } catch (error) {
      console.error("Error generating blog post:", error);
      res.status(500).json({ error: "Failed to generate blog post" });
    }
  });

  // Admin: Auto-generate blog posts for all products (that don't have one yet)
  app.post("/api/admin/blog/generate-all", requireAdmin, async (req, res) => {
    try {
      const allProducts = await storage.getAllProducts();
      let created = 0;
      let skipped = 0;
      for (const product of allProducts) {
        const existing = await storage.getBlogPostByProductId(product.id);
        if (existing) {
          skipped++;
          continue;
        }
        const generated = generateBlogPostForProduct(product);
        await storage.createBlogPost({
          ...generated,
          productId: product.id,
          imageUrl: product.imageUrl || null,
          published: true,
        });
        created++;
      }
      res.json({ success: true, created, skipped, total: allProducts.length });
    } catch (error) {
      console.error("Error generating blog posts:", error);
      res.status(500).json({ error: "Failed to generate blog posts" });
    }
  });

  // ─── SEO Automation: Keywords ───────────────────────────────────────────────

  app.get("/api/admin/seo/keywords", requireAdmin, async (req, res) => {
    try {
      const { status } = req.query as { status?: string };
      const keywords = await storage.getSeoKeywords(status);
      res.json(keywords);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch keywords" });
    }
  });

  app.post("/api/admin/seo/keywords", requireAdmin, async (req, res) => {
    try {
      const { keywords, category } = req.body as { keywords: string | string[]; category?: string };
      const raw = Array.isArray(keywords) ? keywords : String(keywords).split(/[\n,]+/);
      const clean = raw.map(k => k.trim()).filter(k => k.length > 0);
      if (clean.length === 0) {
        return res.status(400).json({ error: "No valid keywords provided" });
      }
      const created = await storage.addSeoKeywords(clean, category);
      res.json({ success: true, count: created.length, keywords: created });
    } catch (error) {
      res.status(500).json({ error: "Failed to add keywords" });
    }
  });

  app.patch("/api/admin/seo/keywords/:id", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body as { status: string };
      const updated = await storage.updateSeoKeywordStatus(id, status);
      if (!updated) return res.status(404).json({ error: "Keyword not found" });
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to update keyword" });
    }
  });

  app.delete("/api/admin/seo/keywords/:id", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteSeoKeyword(id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete keyword" });
    }
  });

  // ─── SEO Automation: Schedule Config ────────────────────────────────────────

  app.get("/api/admin/seo/schedule", requireAdmin, async (req, res) => {
    try {
      const config = await storage.getBlogScheduleConfig();
      res.json(config || { postsPerDay: 7, enabled: false, lastRunAt: null, nextRunAt: null });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch schedule config" });
    }
  });

  app.patch("/api/admin/seo/schedule", requireAdmin, async (req, res) => {
    try {
      const { postsPerDay, enabled } = req.body as { postsPerDay?: number; enabled?: boolean };
      const update: Record<string, unknown> = {};
      if (postsPerDay !== undefined) update.postsPerDay = Math.min(50, Math.max(1, postsPerDay));
      if (enabled !== undefined) update.enabled = enabled;
      const config = await storage.upsertBlogScheduleConfig(update);
      res.json(config);
    } catch (error) {
      res.status(500).json({ error: "Failed to update schedule config" });
    }
  });

  app.post("/api/admin/seo/schedule/run-now", requireAdmin, async (req, res) => {
    try {
      const result = await triggerManualRun();
      res.json({ success: true, ...result });
    } catch (error) {
      console.error("Error running manual schedule:", error);
      res.status(500).json({ error: "Failed to run blog generation" });
    }
  });

  // ─── Media: Self-hosted Images & Downloads ──────────────────────────────────

  const mediaUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 200 * 1024 * 1024 } });

  // GET progress of bulk image download
  app.get("/api/admin/media/download-images/progress", requireAdmin, (_req, res) => {
    res.json(getDownloadProgress());
  });

  // POST start bulk image download from external URLs
  app.post("/api/admin/media/download-images", requireAdmin, async (_req, res) => {
    try {
      startBulkImageDownload();
      res.json({ success: true, message: "Bulk image download started" });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET progress of bulk file download
  app.get("/api/admin/media/download-files/progress", requireAdmin, (_req, res) => {
    res.json(getFileDownloadProgress());
  });

  // POST start bulk file download from external URLs
  app.post("/api/admin/media/download-files", requireAdmin, async (_req, res) => {
    try {
      startBulkFileDownload();
      res.json({ success: true, message: "Bulk file download started" });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST upload a single product image
  app.post("/api/admin/products/:id/upload-image", requireAdmin, mediaUpload.single("image"), async (req: any, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: "No image file provided" });
      const { id } = req.params;
      const product = await storage.getProductById(id);
      if (!product) return res.status(404).json({ error: "Product not found" });
      const localUrl = saveUploadedImage(id, req.file.buffer, req.file.originalname);
      await storage.updateProduct(id, { imageUrl: localUrl });
      res.json({ success: true, imageUrl: localUrl });
    } catch (err: any) {
      console.error("Image upload error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // POST upload a download file for a product
  app.post("/api/admin/products/:id/upload-download", requireAdmin, mediaUpload.single("file"), async (req: any, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: "No file provided" });
      const { id } = req.params;
      const product = await storage.getProductById(id);
      if (!product) return res.status(404).json({ error: "Product not found" });
      const localPath = saveUploadedDownload(id, req.file.buffer, req.file.originalname);
      await storage.updateProduct(id, { downloadPath: localPath });
      res.json({ success: true, downloadPath: localPath });
    } catch (err: any) {
      console.error("Download upload error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // SEO fix: server-side render initial product data into /shop HTML so
  // Google's crawler sees real content instead of an empty React shell.
  // In production this intercepts before the SPA catch-all in static.ts.
  // In development Vite handles it normally (no-op via next()).
  app.get("/shop", async (req, res, next) => {
    if (process.env.NODE_ENV !== "production") return next();
    try {
      const allProducts = await storage.getAllProducts();
      const distPath = path.resolve(path.dirname(__filename), "public");
      const indexPath = path.join(distPath, "index.html");
      if (!fs.existsSync(indexPath)) return next();

      let html = fs.readFileSync(indexPath, "utf-8");

      // Inject initial products so React hydrates immediately with real data
      const safeJson = JSON.stringify(allProducts)
        .replace(/</g, "\\u003c")
        .replace(/>/g, "\\u003e")
        .replace(/&/g, "\\u0026");
      html = html.replace(
        "</head>",
        `<script>window.__SHOP_PRODUCTS__=${safeJson};</script></head>`
      );

      // Inject a crawlable static product list visible to all crawlers
      const baseUrl = `${req.protocol}://${req.get("host")}`;
      const productListHtml = allProducts
        .map(
          (p) =>
            `<li><a href="${baseUrl}/products/${p.slug}">${p.title.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</a> — $${p.salePrice || p.price}</li>`
        )
        .join("\n          ");
      const staticBlock = `
  <noscript>
    <main style="font-family:sans-serif;max-width:1100px;margin:0 auto;padding:24px">
      <h1>Nursing Test Banks &amp; Study Guides — 300+ Titles</h1>
      <p>Browse our complete collection of nursing test banks. Instant digital download after purchase.</p>
      <ul style="columns:2;list-style:disc;padding-left:20px;line-height:2">
          ${productListHtml}
      </ul>
    </main>
  </noscript>`;
      html = html.replace("<body>", `<body>${staticBlock}`);

      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.setHeader("Cache-Control", "public, max-age=300, stale-while-revalidate=60");
      res.send(html);
    } catch (err) {
      console.error("SSR /shop error:", err);
      next();
    }
  });

  return httpServer;
}
