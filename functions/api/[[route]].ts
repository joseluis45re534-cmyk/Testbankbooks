import { Hono } from "hono";
import { handle } from "hono/cloudflare-pages";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import Stripe from "stripe";
import { Resend } from "resend";
import { z } from "zod";
import { eq, ilike, or, and, sql, desc, count, isNotNull, asc } from "drizzle-orm";
import { createD1Db } from "../../server/db-neon";
import { DatabaseStorage } from "../../server/storage";
import {
  products, cartItems, orders, abandonedCarts, siteSettings, chatConversations,
  adminUsers, paymentSettings, blogPosts,
} from "../../shared/schema";
import { generateBotReply, shouldBotReply, BOT_WELCOME } from "../../server/chatbot";
import { generateBlogPostForProduct } from "../../server/blogGenerator";

// ─── Types ───────────────────────────────────────────────────────────────────

type Env = {
  DB: D1Database;
  UPLOADS: R2Bucket;
  SESSION_SECRET: string;
  STRIPE_SECRET_KEY?: string;
  STRIPE_PUBLISHABLE_KEY?: string;
  PAYPAL_CLIENT_ID?: string;
  PAYPAL_CLIENT_SECRET?: string;
  RESEND_API_KEY?: string;
  WC_URL?: string;
  WC_KEY?: string;
  WC_SECRET?: string;
};

type Variables = {
  sessionId: string;
  adminId?: string;
  adminUsername?: string;
  storage: DatabaseStorage;
  db: ReturnType<typeof createD1Db>;
};

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

// ─── Middleware ───────────────────────────────────────────────────────────────

app.use("*", async (c, next) => {
  const db = createD1Db(c.env.DB);
  const storage = new DatabaseStorage(db);
  c.set("db", db);
  c.set("storage", storage);

  // Cart session cookie
  let sessionId = getCookie(c, "tbb_session");
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    setCookie(c, "tbb_session", sessionId, {
      httpOnly: true,
      secure: true,
      sameSite: "Lax",
      maxAge: 7 * 24 * 60 * 60,
      path: "/",
    });
  }
  c.set("sessionId", sessionId);

  // Admin JWT
  const adminToken = getCookie(c, "tbb_admin");
  if (adminToken) {
    try {
      const secret = new TextEncoder().encode(c.env.SESSION_SECRET);
      const { payload } = await jwtVerify(adminToken, secret);
      c.set("adminId", payload.adminId as string);
      c.set("adminUsername", payload.adminUsername as string);
    } catch {
      // invalid token — just ignore it
    }
  }

  await next();
});

// requireAdmin middleware factory
function requireAdmin() {
  return async (c: any, next: any) => {
    if (!c.get("adminId")) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    await next();
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function getStripeKeys(storage: DatabaseStorage, env: Env) {
  try {
    const setting = await storage.getPaymentSetting("stripe");
    if (setting?.config) {
      const cfg = JSON.parse(setting.config);
      return {
        secretKey: cfg.secretKey || env.STRIPE_SECRET_KEY || null,
        publishableKey: cfg.publishableKey || env.STRIPE_PUBLISHABLE_KEY || null,
      };
    }
  } catch {}
  return {
    secretKey: env.STRIPE_SECRET_KEY || null,
    publishableKey: env.STRIPE_PUBLISHABLE_KEY || null,
  };
}

async function getPayPalKeys(storage: DatabaseStorage, env: Env) {
  try {
    const setting = await storage.getPaymentSetting("paypal");
    if (setting?.config) {
      const cfg = JSON.parse(setting.config);
      return {
        clientId: cfg.clientId || env.PAYPAL_CLIENT_ID || null,
        clientSecret: cfg.clientSecret || env.PAYPAL_CLIENT_SECRET || null,
      };
    }
  } catch {}
  return {
    clientId: env.PAYPAL_CLIENT_ID || null,
    clientSecret: env.PAYPAL_CLIENT_SECRET || null,
  };
}

async function getPayPalAccessToken(clientId: string, clientSecret: string): Promise<string> {
  const credentials = btoa(`${clientId}:${clientSecret}`);
  const res = await fetch("https://api-m.paypal.com/v1/oauth2/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  const data: any = await res.json();
  return data.access_token;
}

function sendEmail(resendKey: string, opts: { to: string; subject: string; html: string }) {
  const resend = new Resend(resendKey);
  return resend.emails.send({ from: "NursTestBank <support@nurstestbank.com>", ...opts });
}

function buildOrderEmailHtml(data: {
  customerName: string | null;
  orderId: string;
  amount: string;
  paymentMethod: string;
  productTitles: string[];
}) {
  const displayName = data.customerName || "Valued Customer";
  const downloadLink = `https://nurstestbank.com/thank-you/${data.orderId}`;
  const productListHtml = data.productTitles
    .map((t) => `<li style="padding:8px 0;border-bottom:1px solid #eee">${t}</li>`)
    .join("");
  return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f4f4f5;font-family:sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 20px">
<tr><td align="center"><table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;overflow:hidden">
<tr><td style="background:#1a1a2e;padding:30px 40px;text-align:center"><h1 style="color:#fff;margin:0">NursTestBank</h1></td></tr>
<tr><td style="padding:40px">
<h2 style="text-align:center">Thank You for Your Purchase!</h2>
<p style="text-align:center;color:#6b7280">Hi ${displayName}, your order has been confirmed.</p>
<h3>Your Items</h3>
<ul style="list-style:none;padding:0">${productListHtml}</ul>
<h3>Your Downloads Are Ready</h3>
<div style="background:#f0fdf4;border:2px solid #bbf7d0;border-radius:10px;padding:24px;text-align:center">
<a href="${downloadLink}" style="display:inline-block;background:#16a34a;color:#fff;text-decoration:none;padding:16px 48px;border-radius:8px;font-weight:700;font-size:17px">→ Access My Downloads</a>
<p style="margin:16px 0 0;font-size:12px;color:#6b7280">${downloadLink}</p>
</div>
</td></tr>
<tr><td style="background:#f9fafb;padding:25px 40px;text-align:center;border-top:1px solid #e5e7eb">
<p style="margin:0;font-size:14px;color:#6b7280">Need help? <a href="mailto:support@nurstestbank.com">support@nurstestbank.com</a></p>
</td></tr>
</table></td></tr></table></body></html>`;
}

function buildRecoveryEmailHtml(data: {
  customerName: string | null;
  productTitles: string[];
  totalAmount: string | null;
}) {
  const displayName = data.customerName || "there";
  const amount = data.totalAmount ? `$${parseFloat(data.totalAmount).toFixed(2)}` : "";
  const productListHtml = data.productTitles
    .map((t) => `<li style="padding:8px 0;border-bottom:1px solid #eee">${t}</li>`)
    .join("");
  return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f4f4f5;font-family:sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 20px">
<tr><td align="center"><table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;overflow:hidden">
<tr><td style="background:#1a1a2e;padding:30px 40px;text-align:center"><h1 style="color:#fff;margin:0">NursTestBank</h1></td></tr>
<tr><td style="padding:40px">
<h2 style="text-align:center">You Left Something Behind!</h2>
<p style="text-align:center;color:#6b7280">Hi ${displayName}, your items are still waiting for you.</p>
${data.productTitles.length ? `<ul style="list-style:none;padding:0">${productListHtml}</ul>` : ""}
${amount ? `<p style="text-align:center;font-size:24px;font-weight:700">${amount}</p>` : ""}
<div style="text-align:center;margin:30px 0">
<a href="https://nurstestbank.com/shop" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:14px 40px;border-radius:8px;font-weight:600">Complete Your Purchase</a>
</div>
</td></tr>
<tr><td style="background:#f9fafb;padding:25px 40px;text-align:center;border-top:1px solid #e5e7eb">
<p style="margin:0;font-size:14px;color:#6b7280">Need help? <a href="mailto:support@nurstestbank.com">support@nurstestbank.com</a></p>
</td></tr>
</table></td></tr></table></body></html>`;
}

function escXml(str: string | null | undefined): string {
  if (!str) return "";
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

// ─── Zod schemas ──────────────────────────────────────────────────────────────

const addToCartSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().positive().default(1),
});
const adminLoginSchema = z.object({
  username: z.string().min(1).max(100),
  password: z.string().min(1).max(200),
});
const changeCredentialsSchema = z.object({
  currentPassword: z.string().min(1).max(200),
  newUsername: z.string().min(3).max(100).optional(),
  newPassword: z.string().min(8).max(200).optional(),
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
  downloadPath: z.string().nullable().optional(),
});
const paymentSettingSchema = z.object({
  provider: z.string(),
  enabled: z.boolean(),
  config: z.string().optional(),
});
const contactSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  subject: z.string().min(1),
  message: z.string().min(10),
});

// ─── PayPal ──────────────────────────────────────────────────────────────────

app.get("/paypal/setup", async (c) => {
  const { clientId } = await getPayPalKeys(c.get("storage"), c.env);
  return c.json({ clientId });
});

app.post("/paypal/order", async (c) => {
  try {
    const storage = c.get("storage");
    const sessionId = c.get("sessionId");
    const cartItemsList = await storage.getCartItems(sessionId);
    if (!cartItemsList.length) return c.json({ error: "Cart is empty" }, 400);

    let total = 0;
    for (const item of cartItemsList) {
      const p = item.product;
      if (!p) continue;
      total += (p.salePrice ? parseFloat(p.salePrice) : parseFloat(p.price)) * item.quantity;
    }

    const { clientId, clientSecret } = await getPayPalKeys(storage, c.env);
    if (!clientId || !clientSecret) return c.json({ error: "PayPal not configured" }, 500);

    const accessToken = await getPayPalAccessToken(clientId, clientSecret);
    const res = await fetch("https://api-m.paypal.com/v2/checkout/orders", {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [{ amount: { currency_code: "USD", value: total.toFixed(2) } }],
      }),
    });
    return c.json(await res.json());
  } catch (err) {
    console.error("PayPal order error:", err);
    return c.json({ error: "Failed to create PayPal order" }, 500);
  }
});

app.post("/paypal/order/:orderID/capture", async (c) => {
  try {
    const storage = c.get("storage");
    const sessionId = c.get("sessionId");
    const { customerEmail, customerName, phone } = await c.req.json();

    const cartItemsList = await storage.getCartItems(sessionId);
    if (!cartItemsList.length) return c.json({ error: "Cart is empty" }, 400);

    let serverTotal = 0;
    const productIds: string[] = [];
    const productTitles: string[] = [];
    const savedName = customerName || cartItemsList[0]?.customerName || null;
    const savedPhone = phone || cartItemsList[0]?.phone || null;
    for (const item of cartItemsList) {
      const p = item.product;
      if (!p) continue;
      serverTotal += (p.salePrice ? parseFloat(p.salePrice) : parseFloat(p.price)) * item.quantity;
      productIds.push(p.id);
      productTitles.push(p.title);
    }

    const { clientId, clientSecret } = await getPayPalKeys(storage, c.env);
    if (!clientId || !clientSecret) return c.json({ error: "PayPal not configured" }, 500);

    const accessToken = await getPayPalAccessToken(clientId, clientSecret);
    const captureRes = await fetch(`https://api-m.paypal.com/v2/checkout/orders/${c.req.param("orderID")}/capture`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    });
    const captureData: any = await captureRes.json();

    if (captureData.status !== "COMPLETED") {
      return c.json({ error: "Payment not completed", details: captureData }, 400);
    }

    const capturedAmount = captureData.purchase_units?.[0]?.payments?.captures?.[0]?.amount?.value;
    if (capturedAmount && Math.abs(parseFloat(capturedAmount) - serverTotal) > 0.01) {
      return c.json({ error: "Payment amount mismatch" }, 400);
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

    if (c.env.RESEND_API_KEY) {
      sendEmail(c.env.RESEND_API_KEY, {
        to: order.customerEmail,
        subject: `Order Confirmed - Your Downloads Are Ready! #${order.id.substring(0, 8).toUpperCase()}`,
        html: buildOrderEmailHtml({ customerName: order.customerName || null, orderId: order.id, amount: order.amount, paymentMethod: "paypal", productTitles }),
      }).catch(console.error);
    }

    return c.json({ ...captureData, internalOrder: order });
  } catch (err) {
    console.error("PayPal capture error:", err);
    return c.json({ error: "Failed to capture PayPal order" }, 500);
  }
});

// ─── Stripe ──────────────────────────────────────────────────────────────────

app.get("/api/stripe/config", async (c) => {
  const { publishableKey } = await getStripeKeys(c.get("storage"), c.env);
  if (!publishableKey) return c.json({ error: "Stripe not configured" }, 500);
  return c.json({ publishableKey });
});

app.post("/api/stripe/create-payment-intent", async (c) => {
  try {
    const storage = c.get("storage");
    const sessionId = c.get("sessionId");
    const { customerEmail } = await c.req.json();

    const cartItemsList = await storage.getCartItems(sessionId);
    if (!cartItemsList.length) return c.json({ error: "Cart is empty" }, 400);

    let total = 0;
    const productIds: string[] = [];
    const productTitles: string[] = [];
    for (const item of cartItemsList) {
      const p = item.product;
      if (!p) continue;
      total += (p.salePrice ? parseFloat(p.salePrice) : parseFloat(p.price)) * item.quantity;
      productIds.push(p.id);
      productTitles.push(p.title);
    }

    const { secretKey } = await getStripeKeys(storage, c.env);
    if (!secretKey) return c.json({ error: "Stripe not configured" }, 500);

    const stripe = new Stripe(secretKey);
    const pi = await stripe.paymentIntents.create({
      amount: Math.round(total * 100),
      currency: "usd",
      metadata: { customerEmail: customerEmail || "", sessionId, productIds: productIds.join(",") },
      receipt_email: customerEmail || undefined,
      automatic_payment_methods: { enabled: true },
    });

    return c.json({ clientSecret: pi.client_secret, amount: total.toFixed(2) });
  } catch (err) {
    console.error("Stripe PI error:", err);
    return c.json({ error: "Failed to create payment intent" }, 500);
  }
});

app.post("/api/stripe/confirm-payment", async (c) => {
  try {
    const storage = c.get("storage");
    const sessionId = c.get("sessionId");
    const { paymentIntentId, customerEmail, customerName, phone } = await c.req.json();
    if (!paymentIntentId) return c.json({ error: "Payment intent ID required" }, 400);

    const { secretKey } = await getStripeKeys(storage, c.env);
    if (!secretKey) return c.json({ error: "Stripe not configured" }, 500);

    const stripe = new Stripe(secretKey);
    const pi = await stripe.paymentIntents.retrieve(paymentIntentId);
    if (pi.status !== "succeeded") return c.json({ error: "Payment not completed" }, 400);
    if (pi.metadata.sessionId !== sessionId) return c.json({ error: "Payment session mismatch" }, 403);

    const cartItemsList = await storage.getCartItems(sessionId);
    if (!cartItemsList.length) return c.json({ error: "Cart is empty" }, 400);

    let serverTotal = 0;
    const productIds: string[] = [];
    const productTitles: string[] = [];
    const savedName = customerName || cartItemsList[0]?.customerName || null;
    const savedPhone = phone || cartItemsList[0]?.phone || null;
    for (const item of cartItemsList) {
      const p = item.product;
      if (!p) continue;
      serverTotal += (p.salePrice ? parseFloat(p.salePrice) : parseFloat(p.price)) * item.quantity;
      productIds.push(p.id);
      productTitles.push(p.title);
    }

    const paidAmount = pi.amount / 100;
    if (Math.abs(paidAmount - serverTotal) > 0.01) return c.json({ error: "Payment amount mismatch" }, 400);

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

    if (c.env.RESEND_API_KEY) {
      sendEmail(c.env.RESEND_API_KEY, {
        to: order.customerEmail,
        subject: `Order Confirmed - Your Downloads Are Ready! #${order.id.substring(0, 8).toUpperCase()}`,
        html: buildOrderEmailHtml({ customerName: order.customerName || null, orderId: order.id, amount: order.amount, paymentMethod: "stripe", productTitles }),
      }).catch(console.error);
    }

    return c.json({ success: true, order });
  } catch (err) {
    console.error("Stripe confirm error:", err);
    return c.json({ error: "Failed to confirm payment" }, 500);
  }
});

// ─── Products ────────────────────────────────────────────────────────────────

app.get("/api/products", async (c) => {
  const search = c.req.query("search") || "";
  const category = c.req.query("category") || null;
  const items = await c.get("storage").getProductsBySearch(search, category);
  return c.json(items);
});

app.get("/api/products/id/:id", async (c) => {
  const product = await c.get("storage").getProductById(c.req.param("id"));
  if (!product) return c.json({ error: "Product not found" }, 404);
  return c.json(product);
});

app.get("/api/products/:slug", async (c) => {
  const product = await c.get("storage").getProductBySlug(c.req.param("slug"));
  if (!product) return c.json({ error: "Product not found" }, 404);
  return c.json(product);
});

app.get("/api/categories", async (c) => c.json(await c.get("storage").getCategories()));

// ─── Cart ─────────────────────────────────────────────────────────────────────

app.get("/api/cart", async (c) => c.json(await c.get("storage").getCartItems(c.get("sessionId"))));

app.post("/api/cart", async (c) => {
  const body = await c.req.json();
  const v = addToCartSchema.safeParse(body);
  if (!v.success) return c.json({ error: "Invalid request", details: v.error.errors }, 400);

  const storage = c.get("storage");
  const product = await storage.getProductById(v.data.productId);
  if (!product) return c.json({ error: "Product not found" }, 404);

  const item = await storage.addToCart({ sessionId: c.get("sessionId"), productId: v.data.productId, quantity: 1 });
  return c.json(item);
});

app.patch("/api/cart/:itemId", async (c) => {
  const { quantity } = await c.req.json();
  if (!quantity || quantity < 1) return c.json({ error: "Invalid quantity" }, 400);
  const item = await c.get("storage").updateCartItemQuantity(c.req.param("itemId"), quantity);
  if (!item) return c.json({ error: "Cart item not found" }, 404);
  return c.json(item);
});

app.delete("/api/cart/:itemId", async (c) => {
  await c.get("storage").removeCartItem(c.req.param("itemId"));
  return c.json({ success: true });
});

app.delete("/api/cart", async (c) => {
  await c.get("storage").clearCart(c.get("sessionId"));
  return c.json({ success: true });
});

app.post("/api/cart/email", async (c) => {
  try {
    const sessionId = c.get("sessionId");
    const { email, customerName, phone } = await c.req.json();
    if (!email) return c.json({ error: "Email required" }, 400);
    const db = c.get("db");
    const updateData: any = { email };
    if (customerName) updateData.customerName = customerName;
    if (phone) updateData.phone = phone;
    await db.update(cartItems).set(updateData).where(eq(cartItems.sessionId, sessionId));
    await db.update(abandonedCarts).set(updateData).where(eq(abandonedCarts.sessionId, sessionId));
    return c.json({ success: true });
  } catch (err) {
    console.error("Save cart email error:", err);
    return c.json({ error: "Failed to save email" }, 500);
  }
});

// ─── Orders ───────────────────────────────────────────────────────────────────

app.get("/api/orders/:id", async (c) => {
  const storage = c.get("storage");
  const order = await storage.getOrderById(c.req.param("id"));
  if (!order) return c.json({ error: "Order not found" }, 404);
  const productIds = order.productIds || [];
  const orderProducts = [];
  for (const pid of productIds) {
    const p = await storage.getProductById(pid);
    if (p) orderProducts.push({ id: p.id, title: p.title, price: p.price, imageUrl: p.imageUrl });
  }
  return c.json({ ...order, products: orderProducts });
});

app.post("/api/orders/:id/generate-download", async (c) => {
  const storage = c.get("storage");
  const order = await storage.getOrderById(c.req.param("id"));
  if (!order) return c.json({ error: "Order not found" }, 404);
  if (order.status !== "paid" && order.status !== "completed") return c.json({ error: "Order not verified" }, 403);
  const tokens = [];
  for (const pid of order.productIds || []) {
    const p = await storage.getProductById(pid);
    if (!p) continue;
    tokens.push({ productId: pid, productTitle: p.title, downloadUrl: p.downloadPath || "" });
  }
  return c.json({ tokens });
});

// ─── Contact ──────────────────────────────────────────────────────────────────

app.post("/api/contact", async (c) => {
  const v = contactSchema.safeParse(await c.req.json());
  if (!v.success) return c.json({ error: v.error.errors[0].message }, 400);
  console.log("Contact form:", v.data);
  return c.json({ success: true, message: "Your message has been received. We'll respond within 24 hours." });
});

// ─── Site settings (public) ───────────────────────────────────────────────────

app.get("/api/site-settings/custom-html", async (c) => {
  const db = c.get("db");
  const results = await db.select().from(siteSettings).where(
    or(eq(siteSettings.key, "headerHtml"), eq(siteSettings.key, "bodyHtml"), eq(siteSettings.key, "footerHtml"))
  );
  const out: Record<string, string> = {};
  for (const r of results) out[r.key] = r.value || "";
  return c.json(out);
});

// ─── Sitemap / robots / feeds ─────────────────────────────────────────────────

app.get("/sitemap.xml", async (c) => {
  const storage = c.get("storage");
  const [allProducts, blogPostsList] = await Promise.all([
    storage.getAllProducts(),
    storage.getPublishedBlogPosts(),
  ]);
  const base = "https://nurstestbank.com";
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
  const staticPages = [
    ["/", "daily", "1.0"], ["/shop", "daily", "0.9"], ["/blog", "daily", "0.8"],
    ["/about", "monthly", "0.7"], ["/contact", "monthly", "0.6"],
    ["/privacy-policy", "yearly", "0.3"], ["/terms-conditions", "yearly", "0.3"],
    ["/refund-policy", "yearly", "0.3"], ["/shipping-policy", "yearly", "0.3"],
  ];
  for (const [path, freq, pri] of staticPages) {
    xml += `  <url>\n    <loc>${base}${path}</loc>\n    <changefreq>${freq}</changefreq>\n    <priority>${pri}</priority>\n  </url>\n`;
  }
  for (const p of allProducts) {
    xml += `  <url>\n    <loc>${base}/products/${p.slug}</loc>\n    <changefreq>weekly</changefreq>\n    <priority>0.8</priority>\n  </url>\n`;
  }
  for (const p of blogPostsList) {
    xml += `  <url>\n    <loc>${base}/blog/${p.slug}</loc>\n    <changefreq>monthly</changefreq>\n    <priority>0.7</priority>\n  </url>\n`;
  }
  xml += "</urlset>";
  return new Response(xml, { headers: { "Content-Type": "application/xml" } });
});

app.get("/robots.txt", (c) => {
  const txt = `User-agent: Googlebot\nAllow: /\nDisallow: /admin\nDisallow: /admin/*\nDisallow: /checkout\nDisallow: /api/\n\nUser-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /admin/*\nDisallow: /checkout\nDisallow: /api/\n\nSitemap: https://nurstestbank.com/sitemap.xml\n`;
  return new Response(txt, { headers: { "Content-Type": "text/plain" } });
});

app.get("/feed/google-shopping.xml", async (c) => {
  const allProducts = await c.get("storage").getAllProducts();
  const base = "https://nurstestbank.com";
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<rss xmlns:g="http://base.google.com/ns/1.0" version="2.0">\n  <channel>\n';
  xml += `    <title>NursTestBank - Google Shopping Feed</title>\n    <link>${base}</link>\n    <description>Digital exam prep products.</description>\n`;
  for (const p of allProducts) {
    if (!p.imageUrl) continue;
    const price = parseFloat(p.price);
    const salePrice = p.salePrice ? parseFloat(p.salePrice) : null;
    const imageUrl = p.imageUrl.startsWith("http") ? p.imageUrl : `${base}${p.imageUrl}`;
    xml += `    <item>\n      <g:id>${escXml(p.id)}</g:id>\n      <g:title>${escXml(p.title)}</g:title>\n`;
    xml += `      <g:link>${base}/products/${p.slug}</g:link>\n      <g:image_link>${escXml(imageUrl)}</g:image_link>\n`;
    xml += `      <g:availability>in_stock</g:availability>\n      <g:price>${price.toFixed(2)} USD</g:price>\n      <g:condition>new</g:condition>\n`;
    if (salePrice !== null && salePrice < price) xml += `      <g:sale_price>${salePrice.toFixed(2)} USD</g:sale_price>\n`;
    xml += `      <g:brand>${escXml(p.brand || "NursTestBank")}</g:brand>\n      <g:identifier_exists>false</g:identifier_exists>\n    </item>\n`;
  }
  xml += "  </channel>\n</rss>\n";
  return new Response(xml, { headers: { "Content-Type": "application/xml; charset=utf-8" } });
});

// ─── Admin: Auth ──────────────────────────────────────────────────────────────

app.post("/api/admin/login", async (c) => {
  try {
    const v = adminLoginSchema.safeParse(await c.req.json());
    if (!v.success) return c.json({ error: "Invalid credentials" }, 400);
    const { username, password } = v.data;

    const storage = c.get("storage");
    const admin = await storage.getAdminByUsername(username);
    const dummyHash = "$2b$10$CwTycUXWue0Thq9StjUM0uJ8ZoP9P9P9P9P9P9P9P9P9P9P9P9P9P";
    const isValid = admin
      ? await bcrypt.compare(password, admin.password)
      : (await bcrypt.compare(password, dummyHash), false);

    if (!admin || !isValid) return c.json({ error: "Invalid credentials" }, 401);

    const secret = new TextEncoder().encode(c.env.SESSION_SECRET);
    const token = await new SignJWT({ adminId: admin.id, adminUsername: admin.username })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("7d")
      .sign(secret);

    setCookie(c, "tbb_admin", token, {
      httpOnly: true,
      secure: true,
      sameSite: "Lax",
      maxAge: 7 * 24 * 60 * 60,
      path: "/",
    });

    return c.json({ success: true, username: admin.username });
  } catch (err) {
    console.error("Admin login error:", err);
    return c.json({ error: "Login failed" }, 500);
  }
});

app.get("/api/admin/me", (c) => {
  const adminId = c.get("adminId");
  if (adminId) return c.json({ authenticated: true, username: c.get("adminUsername") });
  return c.json({ authenticated: false });
});

app.post("/api/admin/logout", (c) => {
  deleteCookie(c, "tbb_admin", { path: "/" });
  return c.json({ success: true });
});

app.post("/api/admin/change-credentials", requireAdmin(), async (c) => {
  try {
    const v = changeCredentialsSchema.safeParse(await c.req.json());
    if (!v.success) return c.json({ error: v.error.errors[0]?.message || "Invalid input" }, 400);
    const { currentPassword, newUsername, newPassword } = v.data;
    if (!newUsername && !newPassword) return c.json({ error: "Provide a new username or new password" }, 400);

    const storage = c.get("storage");
    const admin = await storage.getAdminById(c.get("adminId")!);
    if (!admin) return c.json({ error: "Admin not found" }, 404);

    const isValid = await bcrypt.compare(currentPassword, admin.password);
    if (!isValid) return c.json({ error: "Current password is incorrect" }, 401);

    const updates: { username?: string; password?: string } = {};
    if (newUsername && newUsername !== admin.username) {
      const existing = await storage.getAdminByUsername(newUsername);
      if (existing) return c.json({ error: "Username already taken" }, 409);
      updates.username = newUsername;
    }
    if (newPassword) updates.password = await bcrypt.hash(newPassword, 10);

    const updated = await storage.updateAdminUser(admin.id, updates);

    // Re-issue JWT with updated username
    const secret = new TextEncoder().encode(c.env.SESSION_SECRET);
    const token = await new SignJWT({ adminId: updated.id, adminUsername: updated.username })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("7d")
      .sign(secret);
    setCookie(c, "tbb_admin", token, { httpOnly: true, secure: true, sameSite: "Lax", maxAge: 7 * 24 * 60 * 60, path: "/" });

    return c.json({ success: true, username: updated.username });
  } catch (err) {
    console.error("Change credentials error:", err);
    return c.json({ error: "Failed to update credentials" }, 500);
  }
});

// ─── Admin: Stats & Orders ────────────────────────────────────────────────────

app.get("/api/admin/stats", requireAdmin(), async (c) => {
  const storage = c.get("storage");
  await storage.detectAndRecordAbandonedCarts(60);
  return c.json(await storage.getDashboardStats());
});

app.get("/api/admin/sales-trend", requireAdmin(), async (c) => {
  const days = parseInt(c.req.query("days") || "30");
  return c.json(await c.get("storage").getSalesTrend(days));
});

app.get("/api/admin/orders", requireAdmin(), async (c) => {
  const storage = c.get("storage");
  const search = c.req.query("search");
  const result = search ? await storage.getOrdersByEmail(search) : await storage.getAllOrders();
  return c.json(result);
});

app.post("/api/admin/orders", requireAdmin(), async (c) => {
  const order = await c.get("storage").createOrder(await c.req.json());
  return c.json(order);
});

app.patch("/api/admin/orders/:id", requireAdmin(), async (c) => {
  const { status } = await c.req.json();
  const order = await c.get("storage").updateOrderStatus(c.req.param("id"), status);
  return c.json(order);
});

app.post("/api/admin/orders/:id/resend-email", requireAdmin(), async (c) => {
  if (!c.env.RESEND_API_KEY) return c.json({ error: "RESEND_API_KEY not configured" }, 500);
  const storage = c.get("storage");
  const order = await storage.getOrderById(c.req.param("id"));
  if (!order) return c.json({ error: "Order not found" }, 404);

  const downloadLinks: { title: string; url: string }[] = [];
  for (const pid of order.productIds || []) {
    const p = await storage.getProductById(pid);
    if (p?.downloadPath) downloadLinks.push({ title: p.title, url: p.downloadPath });
  }

  const result = await sendEmail(c.env.RESEND_API_KEY, {
    to: order.customerEmail,
    subject: `Order Confirmed - Your Downloads Are Ready! #${order.id.substring(0, 8).toUpperCase()}`,
    html: buildOrderEmailHtml({ customerName: order.customerName || null, orderId: order.id, amount: order.amount, paymentMethod: order.paymentMethod || "stripe", productTitles: order.productTitles || [] }),
  });
  if ((result as any).error) return c.json({ error: "Failed to send email" }, 500);
  return c.json({ success: true, message: `Confirmation email resent to ${order.customerEmail}` });
});

// ─── Admin: Abandoned Carts ───────────────────────────────────────────────────

app.get("/api/admin/abandoned-carts", requireAdmin(), async (c) => {
  const storage = c.get("storage");
  await storage.detectAndRecordAbandonedCarts(60);
  return c.json(await storage.getAllAbandonedCarts());
});

app.post("/api/admin/abandoned-carts/:id/send-recovery", requireAdmin(), async (c) => {
  if (!c.env.RESEND_API_KEY) return c.json({ error: "RESEND_API_KEY not configured" }, 500);
  const storage = c.get("storage");
  const allCarts = await storage.getAllAbandonedCarts();
  const cart = allCarts.find((x) => x.id === c.req.param("id"));
  if (!cart) return c.json({ error: "Abandoned cart not found" }, 404);
  if (!cart.email) return c.json({ error: "No email address for this cart" }, 400);

  await sendEmail(c.env.RESEND_API_KEY, {
    to: cart.email,
    subject: "You left items in your cart - Complete your purchase!",
    html: buildRecoveryEmailHtml({ customerName: cart.customerName || null, productTitles: cart.productTitles || [], totalAmount: cart.totalAmount || null }),
  });
  await storage.markRecoveryEmailSent(c.req.param("id"));
  return c.json({ success: true, message: "Recovery email sent" });
});

// ─── Admin: Products ──────────────────────────────────────────────────────────

app.get("/api/admin/products/missing-downloads", requireAdmin(), async (c) =>
  c.json(await c.get("storage").getProductsWithoutDownloadPath())
);

app.patch("/api/admin/products/:id", requireAdmin(), async (c) => {
  const v = updateProductSchema.safeParse(await c.req.json());
  if (!v.success) return c.json({ error: "Invalid data", details: v.error.errors }, 400);
  return c.json(await c.get("storage").updateProduct(c.req.param("id"), v.data));
});

app.patch("/api/admin/products/:id/download-path", requireAdmin(), async (c) => {
  const { downloadPath } = await c.req.json();
  if (!downloadPath || typeof downloadPath !== "string") return c.json({ error: "Invalid download path" }, 400);
  return c.json(await c.get("storage").updateProductDownloadPath(c.req.param("id"), downloadPath));
});

app.post("/api/admin/products/bulk-update", requireAdmin(), async (c) => {
  const { ids, updates } = await c.req.json();
  if (!Array.isArray(ids)) return c.json({ error: "Invalid data" }, 400);
  await c.get("storage").bulkUpdateProducts(ids, updates);
  return c.json({ success: true });
});

app.post("/api/admin/products/bulk-download-paths", requireAdmin(), async (c) => {
  const { updates } = await c.req.json();
  if (!Array.isArray(updates)) return c.json({ error: "Invalid updates format" }, 400);
  await c.get("storage").bulkUpdateDownloadPaths(updates);
  return c.json({ success: true, updated: updates.length });
});

// File upload endpoints — store in R2
app.post("/api/admin/products/:id/upload-image", requireAdmin(), async (c) => {
  try {
    const storage = c.get("storage");
    const { id } = c.req.param();
    const product = await storage.getProductById(id);
    if (!product) return c.json({ error: "Product not found" }, 404);

    const formData = await c.req.formData();
    const file = formData.get("image") as File | null;
    if (!file) return c.json({ error: "No image file provided" }, 400);

    const ext = file.name.split(".").pop() || "jpg";
    const key = `images/${id}-${Date.now()}.${ext}`;
    await c.env.UPLOADS.put(key, file.stream(), { httpMetadata: { contentType: file.type } });

    const imageUrl = `https://pub-uploads.nurstestbank.com/${key}`;
    await storage.updateProduct(id, { imageUrl });
    return c.json({ success: true, imageUrl });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

app.post("/api/admin/products/:id/upload-download", requireAdmin(), async (c) => {
  try {
    const storage = c.get("storage");
    const { id } = c.req.param();
    const product = await storage.getProductById(id);
    if (!product) return c.json({ error: "Product not found" }, 404);

    const formData = await c.req.formData();
    const file = formData.get("file") as File | null;
    if (!file) return c.json({ error: "No file provided" }, 400);

    const ext = file.name.split(".").pop() || "zip";
    const key = `downloads/${id}-${Date.now()}.${ext}`;
    await c.env.UPLOADS.put(key, file.stream(), { httpMetadata: { contentType: file.type } });

    const downloadPath = `https://pub-uploads.nurstestbank.com/${key}`;
    await storage.updateProduct(id, { downloadPath });
    return c.json({ success: true, downloadPath });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// ─── Admin: Tags ──────────────────────────────────────────────────────────────

app.get("/api/admin/tags", requireAdmin(), async (c) => c.json(await c.get("storage").getAllTags()));

app.post("/api/admin/tags", requireAdmin(), async (c) => {
  const { name } = await c.req.json();
  return c.json(await c.get("storage").createTag({ name }));
});

app.delete("/api/admin/tags/:id", requireAdmin(), async (c) => {
  await c.get("storage").deleteTag(c.req.param("id"));
  return c.json({ success: true });
});

// ─── Admin: Payment settings ──────────────────────────────────────────────────

app.get("/api/admin/payment-settings", requireAdmin(), async (c) =>
  c.json(await c.get("storage").getAllPaymentSettings())
);

app.post("/api/admin/payment-settings", requireAdmin(), async (c) => {
  const v = paymentSettingSchema.safeParse(await c.req.json());
  if (!v.success) return c.json({ error: "Invalid data" }, 400);
  return c.json(await c.get("storage").upsertPaymentSetting(v.data));
});

// ─── Admin: Site settings ─────────────────────────────────────────────────────

app.get("/api/admin/settings", requireAdmin(), async (c) => {
  const db = c.get("db");
  const rows = await db.select().from(siteSettings);
  const out: Record<string, string> = {};
  for (const r of rows) out[r.key] = r.value || "";
  return c.json(out);
});

app.post("/api/admin/settings", requireAdmin(), async (c) => {
  const db = c.get("db");
  const body = await c.req.json();
  for (const [key, value] of Object.entries(body)) {
    await db.insert(siteSettings).values({ key, value: String(value) })
      .onConflictDoUpdate({ target: siteSettings.key, set: { value: String(value), updatedAt: new Date() } });
  }
  return c.json({ success: true });
});

app.post("/api/admin/site-settings/custom-html", requireAdmin(), async (c) => {
  const { headerHtml, bodyHtml, footerHtml } = await c.req.json();
  const db = c.get("db");
  for (const [key, value] of [["headerHtml", headerHtml || ""], ["bodyHtml", bodyHtml || ""], ["footerHtml", footerHtml || ""]]) {
    await db.insert(siteSettings).values({ key, value })
      .onConflictDoUpdate({ target: siteSettings.key, set: { value, updatedAt: new Date() } });
  }
  return c.json({ success: true });
});

// ─── Admin: Chat ──────────────────────────────────────────────────────────────

app.get("/api/admin/chat/conversations", requireAdmin(), async (c) =>
  c.json(await c.get("storage").getAllConversations())
);

app.get("/api/admin/chat/conversations/:id", requireAdmin(), async (c) => {
  const conv = await c.get("storage").getConversationById(c.req.param("id"));
  if (!conv) return c.json({ error: "Not found" }, 404);
  return c.json(conv);
});

app.post("/api/admin/chat/message", requireAdmin(), async (c) => {
  const { conversationId, message } = await c.req.json();
  if (!conversationId || !message) return c.json({ error: "Required fields missing" }, 400);
  const msg = await c.get("storage").createMessage({ conversationId, message, senderType: "admin", isRead: false });
  return c.json(msg);
});

app.post("/api/admin/chat/mark-read/:conversationId", requireAdmin(), async (c) => {
  await c.get("storage").markMessagesAsRead(c.req.param("conversationId"), "visitor");
  return c.json({ success: true });
});

app.post("/api/admin/chat/close/:conversationId", requireAdmin(), async (c) => {
  return c.json(await c.get("storage").updateConversationStatus(c.req.param("conversationId"), "closed"));
});

app.get("/api/admin/chat/unread-count", requireAdmin(), async (c) =>
  c.json({ count: await c.get("storage").getUnreadMessageCount() })
);

// ─── Chat (public) ────────────────────────────────────────────────────────────

app.post("/api/chat/conversation", async (c) => {
  const { visitorId, visitorName, visitorEmail } = await c.req.json();
  if (!visitorId) return c.json({ error: "Visitor ID required" }, 400);

  const storage = c.get("storage");
  let conversation = await storage.getConversationByVisitorId(visitorId);

  if (!conversation) {
    conversation = await storage.createConversation({
      visitorId,
      visitorName: visitorName || null,
      visitorEmail: visitorEmail || null,
      status: "active",
    });
    await storage.createMessage({
      conversationId: conversation.id,
      message: BOT_WELCOME(visitorName || null),
      senderType: "bot",
      isRead: false,
    }).catch(console.error);
  } else if (visitorName || visitorEmail) {
    const db = c.get("db");
    const updates: Record<string, string> = {};
    if (visitorName) updates.visitorName = visitorName;
    if (visitorEmail) updates.visitorEmail = visitorEmail;
    await db.update(chatConversations).set(updates).where(eq(chatConversations.id, conversation.id));
    conversation = { ...conversation, ...updates } as any;
  }

  const messages = await storage.getMessagesByConversationId(conversation.id);
  return c.json({ ...conversation, messages });
});

app.post("/api/chat/message", async (c) => {
  const { conversationId, message, senderType } = await c.req.json();
  if (!conversationId || !message) return c.json({ error: "Required fields missing" }, 400);

  const storage = c.get("storage");
  const newMessage = await storage.createMessage({
    conversationId,
    message,
    senderType: senderType || "visitor",
    isRead: false,
  });

  if ((senderType || "visitor") === "visitor") {
    try {
      const recent = await storage.getMessagesByConversationId(conversationId);
      if (shouldBotReply(recent)) {
        const conv = await storage.getConversationById(conversationId);
        const reply = await generateBotReply(message, conv?.visitorEmail || null, storage);
        await storage.createMessage({ conversationId, message: reply, senderType: "bot", isRead: false });
      }
    } catch (e) {
      console.error("Bot reply failed:", e);
    }
  }

  return c.json(newMessage);
});

app.get("/api/chat/messages/:conversationId", async (c) =>
  c.json(await c.get("storage").getMessagesByConversationId(c.req.param("conversationId")))
);

app.post("/api/chat/mark-read/:conversationId", async (c) => {
  await c.get("storage").markMessagesAsRead(c.req.param("conversationId"), "admin");
  return c.json({ success: true });
});

// ─── Blog (public) ────────────────────────────────────────────────────────────

app.get("/api/blog", async (c) => {
  const category = c.req.query("category");
  return c.json(await c.get("storage").getPublishedBlogPosts(category));
});

app.get("/api/blog/categories", async (c) => c.json(await c.get("storage").getBlogCategories()));

app.get("/api/blog/by-product/:productId", async (c) => {
  const post = await c.get("storage").getBlogPostByProductId(c.req.param("productId"));
  if (!post || !post.published) return c.json({ error: "Not found" }, 404);
  return c.json(post);
});

app.get("/api/blog/:slug", async (c) => {
  const post = await c.get("storage").getBlogPostBySlug(c.req.param("slug"));
  if (!post || !post.published) return c.json({ error: "Not found" }, 404);
  return c.json(post);
});

// ─── Admin: Blog ──────────────────────────────────────────────────────────────

app.get("/api/admin/blog", requireAdmin(), async (c) => c.json(await c.get("storage").getAllBlogPosts()));

app.post("/api/admin/blog", requireAdmin(), async (c) =>
  c.json(await c.get("storage").createBlogPost(await c.req.json()))
);

app.patch("/api/admin/blog/:id", requireAdmin(), async (c) =>
  c.json(await c.get("storage").updateBlogPost(c.req.param("id"), await c.req.json()))
);

app.delete("/api/admin/blog/:id", requireAdmin(), async (c) => {
  await c.get("storage").deleteBlogPost(c.req.param("id"));
  return c.json({ success: true });
});

app.post("/api/admin/blog/generate/:productId", requireAdmin(), async (c) => {
  const storage = c.get("storage");
  const product = await storage.getProductById(c.req.param("productId"));
  if (!product) return c.json({ error: "Product not found" }, 404);
  const existing = await storage.getBlogPostByProductId(product.id);
  if (existing) return c.json({ success: true, post: existing, alreadyExists: true });
  const generated = generateBlogPostForProduct(product);
  const post = await storage.createBlogPost({ ...generated, productId: product.id, imageUrl: product.imageUrl || null, published: true });
  return c.json({ success: true, post });
});

app.post("/api/admin/blog/generate-all", requireAdmin(), async (c) => {
  const storage = c.get("storage");
  const allProducts = await storage.getAllProducts();
  let created = 0;
  let skipped = 0;
  for (const product of allProducts) {
    if (await storage.getBlogPostByProductId(product.id)) { skipped++; continue; }
    const generated = generateBlogPostForProduct(product);
    await storage.createBlogPost({ ...generated, productId: product.id, imageUrl: product.imageUrl || null, published: true });
    created++;
  }
  return c.json({ success: true, created, skipped, total: allProducts.length });
});

// ─── Admin: SEO Keywords ──────────────────────────────────────────────────────

app.get("/api/admin/seo/keywords", requireAdmin(), async (c) =>
  c.json(await c.get("storage").getSeoKeywords(c.req.query("status")))
);

app.post("/api/admin/seo/keywords", requireAdmin(), async (c) => {
  const { keywords, category } = await c.req.json();
  const raw = Array.isArray(keywords) ? keywords : String(keywords).split(/[\n,]+/);
  const clean = raw.map((k: string) => k.trim()).filter((k: string) => k.length > 0);
  if (!clean.length) return c.json({ error: "No valid keywords" }, 400);
  const created = await c.get("storage").addSeoKeywords(clean, category);
  return c.json({ success: true, count: created.length, keywords: created });
});

app.patch("/api/admin/seo/keywords/:id", requireAdmin(), async (c) => {
  const { status } = await c.req.json();
  const updated = await c.get("storage").updateSeoKeywordStatus(c.req.param("id"), status);
  if (!updated) return c.json({ error: "Not found" }, 404);
  return c.json(updated);
});

app.delete("/api/admin/seo/keywords/:id", requireAdmin(), async (c) => {
  await c.get("storage").deleteSeoKeyword(c.req.param("id"));
  return c.json({ success: true });
});

app.get("/api/admin/seo/schedule", requireAdmin(), async (c) => {
  const config = await c.get("storage").getBlogScheduleConfig();
  return c.json(config || { postsPerDay: 7, enabled: false, lastRunAt: null, nextRunAt: null });
});

app.patch("/api/admin/seo/schedule", requireAdmin(), async (c) => {
  const { postsPerDay, enabled } = await c.req.json();
  const update: Record<string, unknown> = {};
  if (postsPerDay !== undefined) update.postsPerDay = Math.min(50, Math.max(1, postsPerDay));
  if (enabled !== undefined) update.enabled = enabled;
  return c.json(await c.get("storage").upsertBlogScheduleConfig(update));
});

app.post("/api/admin/seo/schedule/run-now", requireAdmin(), async (c) => {
  const storage = c.get("storage");
  const config = await storage.getBlogScheduleConfig();
  const limit = config?.postsPerDay ?? 7;
  const keywords = await storage.getPendingSeoKeywords(limit);
  let created = 0;
  for (const kw of keywords) {
    try {
      const { generateBlogPostFromKeyword } = await import("../../server/blogGenerator");
      const generated = generateBlogPostFromKeyword(kw.keyword, kw.category || undefined);
      await storage.createBlogPost({ ...generated, published: true });
      await storage.updateSeoKeywordStatus(kw.id, "used", generated.slug);
      created++;
    } catch (e) {
      console.error("Blog gen error:", e);
    }
  }
  await storage.upsertBlogScheduleConfig({ lastRunAt: new Date() });
  return c.json({ success: true, created, skipped: keywords.length - created });
});

// ─── Admin: Media (R2) ────────────────────────────────────────────────────────

app.get("/api/admin/media/download-images/progress", requireAdmin(), (c) =>
  c.json({ status: "not_supported", message: "Use per-product upload in CF Workers environment" })
);

app.post("/api/admin/media/download-images", requireAdmin(), (c) =>
  c.json({ success: false, message: "Bulk external download not supported in serverless — upload images via the product upload endpoint" })
);

app.get("/api/admin/media/download-files/progress", requireAdmin(), (c) =>
  c.json({ status: "not_supported" })
);

app.post("/api/admin/media/download-files", requireAdmin(), (c) =>
  c.json({ success: false, message: "Bulk external download not supported in serverless" })
);

export const onRequest = handle(app);
