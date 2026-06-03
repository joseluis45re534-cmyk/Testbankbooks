import {
  products, cartItems, orders, abandonedCarts, adminUsers, paymentSettings, tags, downloadTokens,
  chatConversations, chatMessages, blogPosts, seoKeywords, blogScheduleConfig,
  type Product, type InsertProduct, type CartItem, type InsertCartItem, type CartItemWithProduct,
  type Order, type InsertOrder, type AbandonedCart, type InsertAbandonedCart,
  type AdminUser, type InsertAdminUser, type PaymentSetting, type InsertPaymentSetting,
  type Tag, type InsertTag, type DownloadToken, type InsertDownloadToken,
  type ChatConversation, type InsertChatConversation, type ChatMessage, type InsertChatMessage,
  type ChatConversationWithMessages, type BlogPost, type InsertBlogPost,
  type SeoKeyword, type InsertSeoKeyword, type BlogScheduleConfig
} from "@shared/schema";
import { eq, like, or, and, sql, desc, count, isNotNull, asc, notInArray } from "drizzle-orm";

export interface IStorage {
  getAllProducts(): Promise<Product[]>;
  getProductsBySearch(search: string, category?: string | null): Promise<Product[]>;
  getProductBySlug(slug: string): Promise<Product | undefined>;
  getProductById(id: string): Promise<Product | undefined>;
  insertProduct(product: InsertProduct): Promise<Product>;
  insertProductWithSlug(product: InsertProduct, customSlug: string): Promise<Product>;
  insertProducts(productList: InsertProduct[]): Promise<void>;
  updateProduct(id: string, product: Partial<InsertProduct>): Promise<Product | undefined>;
  updateProductTags(id: string, tags: string[]): Promise<Product | undefined>;
  bulkUpdateProducts(ids: string[], updates: Partial<InsertProduct>): Promise<void>;
  clearAllProducts(): Promise<void>;
  getCartItems(sessionId: string): Promise<CartItemWithProduct[]>;
  addToCart(item: InsertCartItem): Promise<CartItem>;
  updateCartItemQuantity(itemId: string, quantity: number): Promise<CartItem | undefined>;
  removeCartItem(itemId: string): Promise<void>;
  clearCart(sessionId: string): Promise<void>;
  getProductCount(): Promise<number>;
  getCategories(): Promise<{ name: string; count: number }[]>;

  getAllOrders(): Promise<Order[]>;
  getOrderById(id: string): Promise<Order | undefined>;
  createOrder(order: InsertOrder): Promise<Order>;
  updateOrderStatus(id: string, status: string): Promise<Order | undefined>;
  getOrdersByEmail(email: string): Promise<Order[]>;

  getAllAbandonedCarts(): Promise<AbandonedCart[]>;
  createAbandonedCart(cart: InsertAbandonedCart): Promise<AbandonedCart>;
  markRecoveryEmailSent(id: string): Promise<void>;
  detectAndRecordAbandonedCarts(thresholdMinutes?: number): Promise<number>;

  getAdminByUsername(username: string): Promise<AdminUser | undefined>;
  getAdminById(id: string): Promise<AdminUser | undefined>;
  createAdminUser(admin: InsertAdminUser): Promise<AdminUser>;
  updateAdminUser(id: string, updates: { username?: string; password?: string }): Promise<AdminUser>;

  getAllPaymentSettings(): Promise<PaymentSetting[]>;
  getPaymentSetting(provider: string): Promise<PaymentSetting | undefined>;
  upsertPaymentSetting(setting: InsertPaymentSetting): Promise<PaymentSetting>;

  getAllTags(): Promise<Tag[]>;
  createTag(tag: InsertTag): Promise<Tag>;
  deleteTag(id: string): Promise<void>;

  getDashboardStats(): Promise<{ totalRevenue: number; totalOrders: number; abandonedCartCount: number; conversionRate: number; }>;
  getSalesTrend(days: number): Promise<{ date: string; amount: number }[]>;

  createDownloadToken(token: InsertDownloadToken): Promise<DownloadToken>;
  getDownloadToken(token: string): Promise<DownloadToken | undefined>;
  incrementDownloadCount(token: string): Promise<void>;
  getProductsWithoutDownloadPath(): Promise<Product[]>;
  updateProductDownloadPath(id: string, downloadPath: string): Promise<Product | undefined>;
  bulkUpdateDownloadPaths(updates: { id: string; downloadPath: string }[]): Promise<void>;

  getAllConversations(): Promise<ChatConversationWithMessages[]>;
  getConversationById(id: string): Promise<ChatConversationWithMessages | undefined>;
  getConversationByVisitorId(visitorId: string): Promise<ChatConversation | undefined>;
  createConversation(conversation: InsertChatConversation): Promise<ChatConversation>;
  updateConversationStatus(id: string, status: string): Promise<ChatConversation | undefined>;
  getMessagesByConversationId(conversationId: string): Promise<ChatMessage[]>;
  createMessage(message: InsertChatMessage): Promise<ChatMessage>;
  markMessagesAsRead(conversationId: string, senderType: string): Promise<void>;
  getUnreadMessageCount(): Promise<number>;

  getAllBlogPosts(): Promise<BlogPost[]>;
  getPublishedBlogPosts(category?: string): Promise<BlogPost[]>;
  getBlogPostBySlug(slug: string): Promise<BlogPost | undefined>;
  getBlogPostByProductId(productId: string): Promise<BlogPost | undefined>;
  createBlogPost(post: InsertBlogPost): Promise<BlogPost>;
  updateBlogPost(id: string, post: Partial<InsertBlogPost>): Promise<BlogPost | undefined>;
  deleteBlogPost(id: string): Promise<void>;
  getBlogCategories(): Promise<{ name: string; count: number }[]>;

  getSeoKeywords(status?: string): Promise<SeoKeyword[]>;
  getPendingSeoKeywords(limit: number): Promise<SeoKeyword[]>;
  addSeoKeywords(keywords: string[], category?: string): Promise<SeoKeyword[]>;
  updateSeoKeywordStatus(id: string, status: string, blogPostSlug?: string): Promise<SeoKeyword | undefined>;
  deleteSeoKeyword(id: string): Promise<void>;
  getBlogScheduleConfig(): Promise<BlogScheduleConfig | null>;
  upsertBlogScheduleConfig(config: Partial<{ postsPerDay: number; enabled: boolean; lastRunAt: Date | null; nextRunAt: Date | null }>): Promise<BlogScheduleConfig>;
}

// SQLite has no auto-UUID — generate in app code. crypto.randomUUID is in CF Workers + Node 18+.
const uuid = () => crypto.randomUUID();
const now = () => new Date();

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 200);
}

// SQLite LIKE is case-insensitive for ASCII by default. We use lower() to be safe.
function iLikeCondition(column: any, term: string) {
  return sql`lower(${column}) LIKE ${'%' + term.toLowerCase() + '%'}`;
}

export class DatabaseStorage implements IStorage {
  private readonly db: any;

  constructor(dbInstance: any) {
    this.db = dbInstance;
  }

  async getAllProducts(): Promise<Product[]> {
    return this.db.select().from(products);
  }

  async getProductsBySearch(search: string, category?: string | null): Promise<Product[]> {
    const conditions = [];
    if (search) {
      conditions.push(or(iLikeCondition(products.title, search), iLikeCondition(products.description, search)));
    }
    if (category) conditions.push(eq(products.category, category));
    if (!conditions.length) return this.db.select().from(products);
    return this.db.select().from(products).where(and(...conditions));
  }

  async getProductBySlug(slug: string): Promise<Product | undefined> {
    const [p] = await this.db.select().from(products).where(eq(products.slug, slug));
    return p;
  }

  async getProductById(id: string): Promise<Product | undefined> {
    const [p] = await this.db.select().from(products).where(eq(products.id, id));
    return p;
  }

  async insertProduct(product: InsertProduct): Promise<Product> {
    const slug = slugify(product.title);
    const [inserted] = await this.db.insert(products).values({ ...product, slug }).returning();
    return inserted;
  }

  async insertProductWithSlug(product: InsertProduct, customSlug: string): Promise<Product> {
    const [inserted] = await this.db.insert(products).values({ ...product, slug: customSlug }).returning();
    return inserted;
  }

  async insertProducts(productList: InsertProduct[]): Promise<void> {
    for (const p of productList) {
      try {
        await this.db.insert(products).values({ ...p, slug: slugify(p.title) + '-' + p.id }).onConflictDoNothing();
      } catch (e) {
        console.error(`Failed to insert product ${p.id}:`, e);
      }
    }
  }

  async updateProduct(id: string, product: Partial<InsertProduct>): Promise<Product | undefined> {
    const [u] = await this.db.update(products).set(product).where(eq(products.id, id)).returning();
    return u;
  }

  async updateProductTags(id: string, newTags: string[]): Promise<Product | undefined> {
    const [u] = await this.db.update(products).set({ tags: newTags }).where(eq(products.id, id)).returning();
    return u;
  }

  async bulkUpdateProducts(ids: string[], updates: Partial<InsertProduct>): Promise<void> {
    for (const id of ids) await this.db.update(products).set(updates).where(eq(products.id, id));
  }

  async clearAllProducts(): Promise<void> {
    await this.db.delete(cartItems);
    await this.db.delete(products);
  }

  async getCartItems(sessionId: string): Promise<CartItemWithProduct[]> {
    const items = await this.db.select().from(cartItems).where(eq(cartItems.sessionId, sessionId));
    const out: CartItemWithProduct[] = [];
    for (const item of items) {
      const product = await this.getProductById(item.productId);
      if (product) out.push({ ...item, product });
    }
    return out;
  }

  async addToCart(item: InsertCartItem): Promise<CartItem> {
    const existing = await this.db.select().from(cartItems).where(
      and(eq(cartItems.sessionId, item.sessionId), eq(cartItems.productId, item.productId))
    );
    if (existing.length > 0) {
      const e = existing[0];
      if (e.quantity !== 1) {
        const [u] = await this.db.update(cartItems).set({ quantity: 1 }).where(eq(cartItems.id, e.id)).returning();
        return u;
      }
      return e;
    }
    const [inserted] = await this.db.insert(cartItems).values({ id: uuid(), createdAt: now(), ...item, quantity: 1 }).returning();
    return inserted;
  }

  async updateCartItemQuantity(itemId: string, quantity: number): Promise<CartItem | undefined> {
    const [u] = await this.db.update(cartItems).set({ quantity }).where(eq(cartItems.id, itemId)).returning();
    return u;
  }

  async removeCartItem(itemId: string): Promise<void> {
    await this.db.delete(cartItems).where(eq(cartItems.id, itemId));
  }

  async clearCart(sessionId: string): Promise<void> {
    await this.db.delete(cartItems).where(eq(cartItems.sessionId, sessionId));
  }

  async getProductCount(): Promise<number> {
    const r = await this.db.select({ count: sql<number>`count(*)` }).from(products);
    return Number(r[0].count);
  }

  async getCategories(): Promise<{ name: string; count: number }[]> {
    const r = await this.db
      .select({ name: products.category, count: sql<number>`count(*)` })
      .from(products)
      .groupBy(products.category);
    return r.filter((x: any) => x.name).map((x: any) => ({ name: x.name, count: Number(x.count) }));
  }

  async getAllOrders(): Promise<Order[]> {
    return this.db.select().from(orders).orderBy(desc(orders.createdAt));
  }

  async getOrderById(id: string): Promise<Order | undefined> {
    const [o] = await this.db.select().from(orders).where(eq(orders.id, id));
    return o;
  }

  async createOrder(order: InsertOrder): Promise<Order> {
    const [c] = await this.db.insert(orders).values({ id: uuid(), createdAt: now(), ...order }).returning();
    return c;
  }

  async updateOrderStatus(id: string, status: string): Promise<Order | undefined> {
    const [u] = await this.db.update(orders).set({ status }).where(eq(orders.id, id)).returning();
    return u;
  }

  async getOrdersByEmail(email: string): Promise<Order[]> {
    return this.db.select().from(orders).where(iLikeCondition(orders.customerEmail, email));
  }

  async getAllAbandonedCarts(): Promise<AbandonedCart[]> {
    return this.db.select().from(abandonedCarts).orderBy(desc(abandonedCarts.createdAt));
  }

  async createAbandonedCart(cart: InsertAbandonedCart): Promise<AbandonedCart> {
    const [c] = await this.db.insert(abandonedCarts).values({ id: uuid(), createdAt: now(), ...cart }).returning();
    return c;
  }

  async markRecoveryEmailSent(id: string): Promise<void> {
    await this.db.update(abandonedCarts).set({ recoveryEmailSent: true }).where(eq(abandonedCarts.id, id));
  }

  async detectAndRecordAbandonedCarts(thresholdMinutes: number = 60): Promise<number> {
    // SQLite version of the abandoned cart detection.
    // Uses unix-ms timestamps (drizzle ts column) so we compare against an integer cutoff.
    const cutoffMs = Date.now() - thresholdMinutes * 60 * 1000;

    // Get session_ids already in abandoned_carts so we skip them.
    const existing = await this.db.select({ sessionId: abandonedCarts.sessionId }).from(abandonedCarts);
    const existingIds = new Set(existing.map((r: any) => r.sessionId));

    // Group stale carts by session_id with totals.
    const stale = await this.db.all(sql`
      SELECT
        ci.session_id AS sessionId,
        MAX(ci.email) AS email,
        MAX(ci.customer_name) AS customerName,
        MAX(ci.phone) AS phone,
        json_group_array(ci.product_id) AS productIds,
        json_group_array(p.title) AS productTitles,
        SUM(
          CASE
            WHEN p.sale_price IS NOT NULL THEN CAST(p.sale_price AS REAL) * ci.quantity
            ELSE CAST(p.price AS REAL) * ci.quantity
          END
        ) AS totalAmount,
        MAX(ci.created_at) AS lastActivity
      FROM cart_items ci
      JOIN products p ON ci.product_id = p.id
      GROUP BY ci.session_id
      HAVING MAX(ci.created_at) < ${cutoffMs}
    `);

    const rows = (stale as any).results ?? stale;
    let n = 0;
    for (const row of rows as any[]) {
      if (existingIds.has(row.sessionId)) continue;
      try {
        await this.db.insert(abandonedCarts).values({
          id: uuid(),
          createdAt: now(),
          sessionId: row.sessionId,
          email: row.email || null,
          customerName: row.customerName || null,
          phone: row.phone || null,
          productIds: typeof row.productIds === "string" ? JSON.parse(row.productIds) : row.productIds,
          productTitles: typeof row.productTitles === "string" ? JSON.parse(row.productTitles) : row.productTitles,
          totalAmount: String(parseFloat(row.totalAmount).toFixed(2)),
          recoveryEmailSent: false,
        });
        n++;
      } catch (e) {
        console.error("Error creating abandoned cart record:", e);
      }
    }
    return n;
  }

  async getAdminByUsername(username: string): Promise<AdminUser | undefined> {
    const [a] = await this.db.select().from(adminUsers).where(eq(adminUsers.username, username));
    return a;
  }

  async getAdminById(id: string): Promise<AdminUser | undefined> {
    const [a] = await this.db.select().from(adminUsers).where(eq(adminUsers.id, id));
    return a;
  }

  async createAdminUser(admin: InsertAdminUser): Promise<AdminUser> {
    const [c] = await this.db.insert(adminUsers).values({ id: uuid(), createdAt: now(), ...admin }).returning();
    return c;
  }

  async updateAdminUser(id: string, updates: { username?: string; password?: string }): Promise<AdminUser> {
    const [u] = await this.db.update(adminUsers).set(updates).where(eq(adminUsers.id, id)).returning();
    return u;
  }

  async getAllPaymentSettings(): Promise<PaymentSetting[]> {
    return this.db.select().from(paymentSettings);
  }

  async getPaymentSetting(provider: string): Promise<PaymentSetting | undefined> {
    const [s] = await this.db.select().from(paymentSettings).where(eq(paymentSettings.provider, provider));
    return s;
  }

  async upsertPaymentSetting(setting: InsertPaymentSetting): Promise<PaymentSetting> {
    const existing = await this.getPaymentSetting(setting.provider);
    if (existing) {
      const [u] = await this.db.update(paymentSettings).set({ ...setting, updatedAt: now() }).where(eq(paymentSettings.provider, setting.provider)).returning();
      return u;
    }
    const [c] = await this.db.insert(paymentSettings).values({ id: uuid(), updatedAt: now(), ...setting }).returning();
    return c;
  }

  async getAllTags(): Promise<Tag[]> {
    return this.db.select().from(tags);
  }

  async createTag(tag: InsertTag): Promise<Tag> {
    const [c] = await this.db.insert(tags).values({ id: uuid(), createdAt: now(), ...tag }).returning();
    return c;
  }

  async deleteTag(id: string): Promise<void> {
    await this.db.delete(tags).where(eq(tags.id, id));
  }

  async getDashboardStats() {
    const o = await this.db.select({
      count: sql<number>`count(*)`,
      total: sql<number>`COALESCE(SUM(CAST(amount AS REAL)), 0)`
    }).from(orders);
    const a = await this.db.select({ count: sql<number>`count(*)` }).from(abandonedCarts);
    const totalOrders = Number(o[0].count) || 0;
    const totalRevenue = Number(o[0].total) || 0;
    const abandonedCartCount = Number(a[0].count) || 0;
    const conversionRate = totalOrders + abandonedCartCount > 0
      ? (totalOrders / (totalOrders + abandonedCartCount)) * 100
      : 0;
    return { totalRevenue, totalOrders, abandonedCartCount, conversionRate };
  }

  async getSalesTrend(days: number): Promise<{ date: string; amount: number }[]> {
    const sinceMs = Date.now() - days * 24 * 60 * 60 * 1000;
    const r = await this.db.all(sql`
      SELECT
        DATE(created_at / 1000, 'unixepoch') AS date,
        COALESCE(SUM(CAST(amount AS REAL)), 0) AS amount
      FROM orders
      WHERE created_at >= ${sinceMs}
      GROUP BY DATE(created_at / 1000, 'unixepoch')
      ORDER BY date ASC
    `);
    const rows = (r as any).results ?? r;
    return (rows as any[]).map(x => ({ date: x.date, amount: Number(x.amount) }));
  }

  async createDownloadToken(token: InsertDownloadToken): Promise<DownloadToken> {
    const [c] = await this.db.insert(downloadTokens).values({ id: uuid(), createdAt: now(), ...token }).returning();
    return c;
  }

  async getDownloadToken(token: string): Promise<DownloadToken | undefined> {
    const [r] = await this.db.select().from(downloadTokens).where(eq(downloadTokens.token, token));
    return r;
  }

  async incrementDownloadCount(token: string): Promise<void> {
    await this.db.update(downloadTokens)
      .set({ downloadCount: sql`download_count + 1` })
      .where(eq(downloadTokens.token, token));
  }

  async getProductsWithoutDownloadPath(): Promise<Product[]> {
    return this.db.select().from(products).where(
      or(eq(products.downloadPath, ''), sql`${products.downloadPath} IS NULL`)
    );
  }

  async updateProductDownloadPath(id: string, downloadPath: string): Promise<Product | undefined> {
    const [u] = await this.db.update(products).set({ downloadPath }).where(eq(products.id, id)).returning();
    return u;
  }

  async bulkUpdateDownloadPaths(updates: { id: string; downloadPath: string }[]): Promise<void> {
    for (const { id, downloadPath } of updates) {
      await this.db.update(products).set({ downloadPath }).where(eq(products.id, id));
    }
  }

  async getAllConversations(): Promise<ChatConversationWithMessages[]> {
    const conversations = await this.db.select().from(chatConversations).orderBy(desc(chatConversations.lastMessageAt));
    const result: ChatConversationWithMessages[] = [];
    for (const conv of conversations) {
      const messages = await this.db.select().from(chatMessages).where(eq(chatMessages.conversationId, conv.id)).orderBy(chatMessages.createdAt);
      const unreadCount = messages.filter((m: any) => !m.isRead && m.senderType === 'visitor').length;
      result.push({ ...conv, messages, unreadCount });
    }
    return result;
  }

  async getConversationById(id: string): Promise<ChatConversationWithMessages | undefined> {
    const [conv] = await this.db.select().from(chatConversations).where(eq(chatConversations.id, id));
    if (!conv) return undefined;
    const messages = await this.db.select().from(chatMessages).where(eq(chatMessages.conversationId, id)).orderBy(chatMessages.createdAt);
    const unreadCount = messages.filter((m: any) => !m.isRead && m.senderType === 'visitor').length;
    return { ...conv, messages, unreadCount };
  }

  async getConversationByVisitorId(visitorId: string): Promise<ChatConversation | undefined> {
    const [c] = await this.db.select().from(chatConversations)
      .where(and(eq(chatConversations.visitorId, visitorId), eq(chatConversations.status, 'active')));
    return c;
  }

  async createConversation(conversation: InsertChatConversation): Promise<ChatConversation> {
    const [c] = await this.db.insert(chatConversations).values({ id: uuid(), createdAt: now(), lastMessageAt: now(), ...conversation }).returning();
    return c;
  }

  async updateConversationStatus(id: string, status: string): Promise<ChatConversation | undefined> {
    const [u] = await this.db.update(chatConversations).set({ status }).where(eq(chatConversations.id, id)).returning();
    return u;
  }

  async getMessagesByConversationId(conversationId: string): Promise<ChatMessage[]> {
    return this.db.select().from(chatMessages).where(eq(chatMessages.conversationId, conversationId)).orderBy(chatMessages.createdAt);
  }

  async createMessage(message: InsertChatMessage): Promise<ChatMessage> {
    const [c] = await this.db.insert(chatMessages).values({ id: uuid(), createdAt: now(), ...message }).returning();
    await this.db.update(chatConversations).set({ lastMessageAt: now() }).where(eq(chatConversations.id, message.conversationId));
    return c;
  }

  async markMessagesAsRead(conversationId: string, senderType: string): Promise<void> {
    await this.db.update(chatMessages)
      .set({ isRead: true })
      .where(and(eq(chatMessages.conversationId, conversationId), eq(chatMessages.senderType, senderType)));
  }

  async getUnreadMessageCount(): Promise<number> {
    const r = await this.db.select({ count: count() }).from(chatMessages)
      .where(and(eq(chatMessages.isRead, false), eq(chatMessages.senderType, 'visitor')));
    return r[0]?.count || 0;
  }

  async getAllBlogPosts(): Promise<BlogPost[]> {
    return this.db.select().from(blogPosts).orderBy(desc(blogPosts.createdAt));
  }

  async getPublishedBlogPosts(category?: string): Promise<BlogPost[]> {
    if (category) {
      return this.db.select().from(blogPosts).where(and(eq(blogPosts.published, true), eq(blogPosts.category, category))).orderBy(desc(blogPosts.createdAt));
    }
    return this.db.select().from(blogPosts).where(eq(blogPosts.published, true)).orderBy(desc(blogPosts.createdAt));
  }

  async getBlogPostBySlug(slug: string): Promise<BlogPost | undefined> {
    const [p] = await this.db.select().from(blogPosts).where(eq(blogPosts.slug, slug));
    return p;
  }

  async getBlogPostByProductId(productId: string): Promise<BlogPost | undefined> {
    const [p] = await this.db.select().from(blogPosts).where(eq(blogPosts.productId, productId));
    return p;
  }

  async createBlogPost(post: InsertBlogPost): Promise<BlogPost> {
    const [c] = await this.db.insert(blogPosts).values({ id: uuid(), createdAt: now(), updatedAt: now(), ...post }).returning();
    return c;
  }

  async updateBlogPost(id: string, post: Partial<InsertBlogPost>): Promise<BlogPost | undefined> {
    const [u] = await this.db.update(blogPosts).set({ ...post, updatedAt: now() }).where(eq(blogPosts.id, id)).returning();
    return u;
  }

  async deleteBlogPost(id: string): Promise<void> {
    await this.db.delete(blogPosts).where(eq(blogPosts.id, id));
  }

  async getBlogCategories(): Promise<{ name: string; count: number }[]> {
    const r = await this.db
      .select({ name: blogPosts.category, count: count() })
      .from(blogPosts)
      .where(and(eq(blogPosts.published, true), isNotNull(blogPosts.category)))
      .groupBy(blogPosts.category)
      .orderBy(desc(count()));
    return r.filter((x: any) => x.name !== null).map((x: any) => ({ name: x.name, count: Number(x.count) }));
  }

  async getSeoKeywords(status?: string): Promise<SeoKeyword[]> {
    if (status) {
      return this.db.select().from(seoKeywords).where(eq(seoKeywords.status, status)).orderBy(desc(seoKeywords.createdAt));
    }
    return this.db.select().from(seoKeywords).orderBy(desc(seoKeywords.createdAt));
  }

  async getPendingSeoKeywords(limit: number): Promise<SeoKeyword[]> {
    return this.db.select().from(seoKeywords)
      .where(eq(seoKeywords.status, "pending"))
      .orderBy(desc(seoKeywords.priority), asc(seoKeywords.createdAt))
      .limit(limit);
  }

  async addSeoKeywords(keywords: string[], category?: string): Promise<SeoKeyword[]> {
    const values = keywords.map(k => ({
      id: uuid(),
      createdAt: now(),
      keyword: k.trim(),
      category: category || null,
      status: "pending",
    }));
    return this.db.insert(seoKeywords).values(values).returning();
  }

  async updateSeoKeywordStatus(id: string, status: string, blogPostSlug?: string): Promise<SeoKeyword | undefined> {
    const [u] = await this.db.update(seoKeywords)
      .set({ status, usedAt: status === "used" ? now() : null, blogPostSlug: blogPostSlug || null })
      .where(eq(seoKeywords.id, id))
      .returning();
    return u;
  }

  async deleteSeoKeyword(id: string): Promise<void> {
    await this.db.delete(seoKeywords).where(eq(seoKeywords.id, id));
  }

  async getBlogScheduleConfig(): Promise<BlogScheduleConfig | null> {
    const [c] = await this.db.select().from(blogScheduleConfig).limit(1);
    return c || null;
  }

  async upsertBlogScheduleConfig(config: Partial<{ postsPerDay: number; enabled: boolean; lastRunAt: Date | null; nextRunAt: Date | null }>): Promise<BlogScheduleConfig> {
    const existing = await this.getBlogScheduleConfig();
    if (existing) {
      const [u] = await this.db.update(blogScheduleConfig)
        .set({ ...config, updatedAt: now() })
        .where(eq(blogScheduleConfig.id, existing.id))
        .returning();
      return u;
    }
    const [c] = await this.db.insert(blogScheduleConfig).values({ id: uuid(), updatedAt: now(), ...config }).returning();
    return c;
  }
}
