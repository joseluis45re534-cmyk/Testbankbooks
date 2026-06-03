import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Helper: SQLite has no native array type. We store string[] as JSON text.
// Drizzle's `mode: "json"` on a text column handles the (de)serialization.
const jsonStringArray = (name: string) =>
  text(name, { mode: "json" }).$type<string[]>();

// Helper: SQLite has no native boolean. We use integer (0/1) with mode "boolean".
const bool = (name: string) => integer(name, { mode: "boolean" });

// Helper: SQLite has no native timestamp. We use integer (unix ms) with mode "timestamp_ms".
const ts = (name: string) => integer(name, { mode: "timestamp_ms" });

export const products = sqliteTable("products", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  price: text("price").notNull(), // stored as text to preserve decimal precision
  salePrice: text("sale_price"),
  imageUrl: text("image_url"),
  additionalImages: jsonStringArray("additional_images"),
  productUrl: text("product_url"),
  availability: text("availability").default("in_stock"),
  condition: text("condition").default("new"),
  brand: text("brand"),
  category: text("category"),
  slug: text("slug").unique(),
  tags: jsonStringArray("tags"),
  seoTitle: text("seo_title"),
  seoDescription: text("seo_description"),
  downloadPath: text("download_path"),
  wooProductId: text("woo_product_id"),
});

export const downloadTokens = sqliteTable("download_tokens", {
  id: text("id").primaryKey(),
  orderId: text("order_id").notNull(),
  productId: text("product_id").notNull().references(() => products.id),
  token: text("token").notNull().unique(),
  expiresAt: ts("expires_at").notNull(),
  downloadCount: integer("download_count").default(0),
  maxDownloads: integer("max_downloads").default(5),
  createdAt: ts("created_at"),
});

export const cartItems = sqliteTable("cart_items", {
  id: text("id").primaryKey(),
  sessionId: text("session_id").notNull(),
  productId: text("product_id").notNull().references(() => products.id),
  quantity: integer("quantity").notNull().default(1),
  createdAt: ts("created_at"),
  email: text("email"),
  customerName: text("customer_name"),
  phone: text("phone"),
});

export const orders = sqliteTable("orders", {
  id: text("id").primaryKey(),
  customerEmail: text("customer_email").notNull(),
  customerName: text("customer_name"),
  phone: text("phone"),
  country: text("country"),
  amount: text("amount").notNull(),
  status: text("status").notNull().default("paid"),
  paymentMethod: text("payment_method"),
  productIds: jsonStringArray("product_ids"),
  productTitles: jsonStringArray("product_titles"),
  createdAt: ts("created_at"),
});

export const abandonedCarts = sqliteTable("abandoned_carts", {
  id: text("id").primaryKey(),
  sessionId: text("session_id").notNull(),
  email: text("email"),
  customerName: text("customer_name"),
  phone: text("phone"),
  productIds: jsonStringArray("product_ids"),
  productTitles: jsonStringArray("product_titles"),
  totalAmount: text("total_amount"),
  createdAt: ts("created_at"),
  recoveryEmailSent: bool("recovery_email_sent").default(false),
});

export const adminUsers = sqliteTable("admin_users", {
  id: text("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  createdAt: ts("created_at"),
});

export const paymentSettings = sqliteTable("payment_settings", {
  id: text("id").primaryKey(),
  provider: text("provider").notNull().unique(),
  enabled: bool("enabled").default(false),
  config: text("config"),
  updatedAt: ts("updated_at"),
});

export const tags = sqliteTable("tags", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  createdAt: ts("created_at"),
});

export const chatConversations = sqliteTable("chat_conversations", {
  id: text("id").primaryKey(),
  visitorId: text("visitor_id").notNull(),
  visitorName: text("visitor_name"),
  visitorEmail: text("visitor_email"),
  status: text("status").default("active"),
  lastMessageAt: ts("last_message_at"),
  createdAt: ts("created_at"),
});

export const chatMessages = sqliteTable("chat_messages", {
  id: text("id").primaryKey(),
  conversationId: text("conversation_id").notNull().references(() => chatConversations.id),
  senderType: text("sender_type").notNull(),
  message: text("message").notNull(),
  isRead: bool("is_read").default(false),
  createdAt: ts("created_at"),
});

export const siteSettings = sqliteTable("site_settings", {
  id: text("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: text("value"),
  updatedAt: ts("updated_at"),
});

export const blogPosts = sqliteTable("blog_posts", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  excerpt: text("excerpt"),
  content: text("content").notNull(),
  metaTitle: text("meta_title"),
  metaDescription: text("meta_description"),
  category: text("category"),
  productId: text("product_id").references(() => products.id),
  imageUrl: text("image_url"),
  published: bool("published").default(true),
  createdAt: ts("created_at"),
  updatedAt: ts("updated_at"),
});

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const seoKeywords = sqliteTable("seo_keywords", {
  id: text("id").primaryKey(),
  keyword: text("keyword").notNull(),
  category: text("category"),
  status: text("status").default("pending"),
  priority: integer("priority").default(0),
  createdAt: ts("created_at"),
  usedAt: ts("used_at"),
  blogPostSlug: text("blog_post_slug"),
});

export const blogScheduleConfig = sqliteTable("blog_schedule_config", {
  id: text("id").primaryKey(),
  postsPerDay: integer("posts_per_day").default(7),
  enabled: bool("enabled").default(true),
  lastRunAt: ts("last_run_at"),
  nextRunAt: ts("next_run_at"),
  updatedAt: ts("updated_at"),
});

// ─── Insert schemas ─────────────────────────────────────────────────────────

export const insertProductSchema = createInsertSchema(products).omit({ slug: true });
export const insertCartItemSchema = createInsertSchema(cartItems).omit({ id: true, createdAt: true });
export const insertOrderSchema = createInsertSchema(orders).omit({ id: true, createdAt: true });
export const insertAbandonedCartSchema = createInsertSchema(abandonedCarts).omit({ id: true, createdAt: true });
export const insertAdminUserSchema = createInsertSchema(adminUsers).omit({ id: true, createdAt: true });
export const insertPaymentSettingSchema = createInsertSchema(paymentSettings).omit({ id: true, updatedAt: true });
export const insertTagSchema = createInsertSchema(tags).omit({ id: true, createdAt: true });
export const insertDownloadTokenSchema = createInsertSchema(downloadTokens).omit({ id: true, createdAt: true });
export const insertChatConversationSchema = createInsertSchema(chatConversations).omit({ id: true, createdAt: true, lastMessageAt: true });
export const insertChatMessageSchema = createInsertSchema(chatMessages).omit({ id: true, createdAt: true });
export const insertSiteSettingSchema = createInsertSchema(siteSettings).omit({ id: true, updatedAt: true });
export const insertBlogPostSchema = createInsertSchema(blogPosts).omit({ id: true, createdAt: true, updatedAt: true });
export const insertUserSchema = createInsertSchema(users).pick({ username: true, password: true });
export const insertSeoKeywordSchema = createInsertSchema(seoKeywords).omit({ id: true, createdAt: true });

// ─── Types ──────────────────────────────────────────────────────────────────

export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof products.$inferSelect;
export type InsertDownloadToken = z.infer<typeof insertDownloadTokenSchema>;
export type DownloadToken = typeof downloadTokens.$inferSelect;
export type InsertCartItem = z.infer<typeof insertCartItemSchema>;
export type CartItem = typeof cartItems.$inferSelect;
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof orders.$inferSelect;
export type InsertAbandonedCart = z.infer<typeof insertAbandonedCartSchema>;
export type AbandonedCart = typeof abandonedCarts.$inferSelect;
export type InsertAdminUser = z.infer<typeof insertAdminUserSchema>;
export type AdminUser = typeof adminUsers.$inferSelect;
export type InsertPaymentSetting = z.infer<typeof insertPaymentSettingSchema>;
export type PaymentSetting = typeof paymentSettings.$inferSelect;
export type InsertTag = z.infer<typeof insertTagSchema>;
export type Tag = typeof tags.$inferSelect;
export type InsertChatConversation = z.infer<typeof insertChatConversationSchema>;
export type ChatConversation = typeof chatConversations.$inferSelect;
export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertSiteSetting = z.infer<typeof insertSiteSettingSchema>;
export type SiteSetting = typeof siteSettings.$inferSelect;
export type InsertBlogPost = z.infer<typeof insertBlogPostSchema>;
export type BlogPost = typeof blogPosts.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertSeoKeyword = z.infer<typeof insertSeoKeywordSchema>;
export type SeoKeyword = typeof seoKeywords.$inferSelect;
export type BlogScheduleConfig = typeof blogScheduleConfig.$inferSelect;

export type ChatConversationWithMessages = ChatConversation & {
  messages: ChatMessage[];
  unreadCount: number;
};

export type CartItemWithProduct = CartItem & {
  product: Product;
};
