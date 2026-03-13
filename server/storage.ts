import { db } from "./db";
import { 
  products, cartItems, orders, abandonedCarts, adminUsers, paymentSettings, tags, downloadTokens,
  chatConversations, chatMessages, blogPosts,
  type Product, type InsertProduct, type CartItem, type InsertCartItem, type CartItemWithProduct,
  type Order, type InsertOrder, type AbandonedCart, type InsertAbandonedCart,
  type AdminUser, type InsertAdminUser, type PaymentSetting, type InsertPaymentSetting,
  type Tag, type InsertTag, type DownloadToken, type InsertDownloadToken,
  type ChatConversation, type InsertChatConversation, type ChatMessage, type InsertChatMessage,
  type ChatConversationWithMessages, type BlogPost, type InsertBlogPost
} from "@shared/schema";
import { eq, ilike, or, and, sql, desc, lt, inArray, count } from "drizzle-orm";

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
  createAdminUser(admin: InsertAdminUser): Promise<AdminUser>;
  
  getAllPaymentSettings(): Promise<PaymentSetting[]>;
  getPaymentSetting(provider: string): Promise<PaymentSetting | undefined>;
  upsertPaymentSetting(setting: InsertPaymentSetting): Promise<PaymentSetting>;
  
  getAllTags(): Promise<Tag[]>;
  createTag(tag: InsertTag): Promise<Tag>;
  deleteTag(id: string): Promise<void>;
  
  getDashboardStats(): Promise<{
    totalRevenue: number;
    totalOrders: number;
    abandonedCartCount: number;
    conversionRate: number;
  }>;
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
}

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 200);
}

export class DatabaseStorage implements IStorage {
  async getAllProducts(): Promise<Product[]> {
    return db.select().from(products);
  }

  async getProductsBySearch(search: string, category?: string | null): Promise<Product[]> {
    const conditions = [];
    
    if (search) {
      conditions.push(
        or(
          ilike(products.title, `%${search}%`),
          ilike(products.description, `%${search}%`)
        )
      );
    }
    
    if (category) {
      conditions.push(eq(products.category, category));
    }

    if (conditions.length === 0) {
      return db.select().from(products);
    }

    return db.select().from(products).where(and(...conditions));
  }

  async getProductBySlug(slug: string): Promise<Product | undefined> {
    const [product] = await db.select().from(products).where(eq(products.slug, slug));
    return product;
  }

  async getProductById(id: string): Promise<Product | undefined> {
    const [product] = await db.select().from(products).where(eq(products.id, id));
    return product;
  }

  async insertProduct(product: InsertProduct): Promise<Product> {
    const slug = slugify(product.title);
    const [inserted] = await db.insert(products).values({ ...product, slug }).returning();
    return inserted;
  }

  async insertProductWithSlug(product: InsertProduct, customSlug: string): Promise<Product> {
    const [inserted] = await db.insert(products).values({ ...product, slug: customSlug }).returning();
    return inserted;
  }

  async insertProducts(productList: InsertProduct[]): Promise<void> {
    const productsWithSlugs = productList.map((p) => ({
      ...p,
      slug: slugify(p.title) + '-' + p.id,
    }));

    for (const product of productsWithSlugs) {
      try {
        await db.insert(products).values(product).onConflictDoNothing();
      } catch (error) {
        console.error(`Failed to insert product ${product.id}:`, error);
      }
    }
  }

  async updateProduct(id: string, product: Partial<InsertProduct>): Promise<Product | undefined> {
    const [updated] = await db
      .update(products)
      .set(product)
      .where(eq(products.id, id))
      .returning();
    return updated;
  }

  async updateProductTags(id: string, newTags: string[]): Promise<Product | undefined> {
    const [updated] = await db
      .update(products)
      .set({ tags: newTags })
      .where(eq(products.id, id))
      .returning();
    return updated;
  }

  async bulkUpdateProducts(ids: string[], updates: Partial<InsertProduct>): Promise<void> {
    for (const id of ids) {
      await db.update(products).set(updates).where(eq(products.id, id));
    }
  }

  async clearAllProducts(): Promise<void> {
    await db.delete(cartItems);
    await db.delete(products);
  }

  async getCartItems(sessionId: string): Promise<CartItemWithProduct[]> {
    const items = await db
      .select()
      .from(cartItems)
      .where(eq(cartItems.sessionId, sessionId));

    const itemsWithProducts: CartItemWithProduct[] = [];
    for (const item of items) {
      const product = await this.getProductById(item.productId);
      if (product) {
        itemsWithProducts.push({ ...item, product });
      }
    }
    return itemsWithProducts;
  }

  async addToCart(item: InsertCartItem): Promise<CartItem> {
    const existingItems = await db
      .select()
      .from(cartItems)
      .where(
        and(
          eq(cartItems.sessionId, item.sessionId),
          eq(cartItems.productId, item.productId)
        )
      );

    if (existingItems.length > 0) {
      const existing = existingItems[0];
      const [updated] = await db
        .update(cartItems)
        .set({ quantity: existing.quantity + (item.quantity || 1) })
        .where(eq(cartItems.id, existing.id))
        .returning();
      return updated;
    }

    const [inserted] = await db.insert(cartItems).values(item).returning();
    return inserted;
  }

  async updateCartItemQuantity(itemId: string, quantity: number): Promise<CartItem | undefined> {
    const [updated] = await db
      .update(cartItems)
      .set({ quantity })
      .where(eq(cartItems.id, itemId))
      .returning();
    return updated;
  }

  async removeCartItem(itemId: string): Promise<void> {
    await db.delete(cartItems).where(eq(cartItems.id, itemId));
  }

  async clearCart(sessionId: string): Promise<void> {
    await db.delete(cartItems).where(eq(cartItems.sessionId, sessionId));
  }

  async getProductCount(): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)` }).from(products);
    return Number(result[0].count);
  }

  async getCategories(): Promise<{ name: string; count: number }[]> {
    const result = await db
      .select({
        name: products.category,
        count: sql<number>`count(*)`,
      })
      .from(products)
      .groupBy(products.category);
    
    return result
      .filter(r => r.name)
      .map(r => ({ name: r.name!, count: Number(r.count) }));
  }

  async getAllOrders(): Promise<Order[]> {
    return db.select().from(orders).orderBy(desc(orders.createdAt));
  }

  async getOrderById(id: string): Promise<Order | undefined> {
    const [order] = await db.select().from(orders).where(eq(orders.id, id));
    return order;
  }

  async createOrder(order: InsertOrder): Promise<Order> {
    const [created] = await db.insert(orders).values(order).returning();
    return created;
  }

  async updateOrderStatus(id: string, status: string): Promise<Order | undefined> {
    const [updated] = await db
      .update(orders)
      .set({ status })
      .where(eq(orders.id, id))
      .returning();
    return updated;
  }

  async getOrdersByEmail(email: string): Promise<Order[]> {
    return db.select().from(orders).where(ilike(orders.customerEmail, `%${email}%`));
  }

  async getAllAbandonedCarts(): Promise<AbandonedCart[]> {
    return db.select().from(abandonedCarts).orderBy(desc(abandonedCarts.createdAt));
  }

  async createAbandonedCart(cart: InsertAbandonedCart): Promise<AbandonedCart> {
    const [created] = await db.insert(abandonedCarts).values(cart).returning();
    return created;
  }

  async markRecoveryEmailSent(id: string): Promise<void> {
    await db.update(abandonedCarts).set({ recoveryEmailSent: true }).where(eq(abandonedCarts.id, id));
  }

  async detectAndRecordAbandonedCarts(thresholdMinutes: number = 60): Promise<number> {
    const threshold = new Date(Date.now() - thresholdMinutes * 60 * 1000);

    const staleCarts = await db.execute(sql`
      SELECT 
        ci.session_id,
        MAX(ci.email) as email,
        MAX(ci.customer_name) as customer_name,
        MAX(ci.phone) as phone,
        array_agg(ci.product_id) as product_ids,
        array_agg(p.title) as product_titles,
        SUM(
          CASE 
            WHEN p.sale_price IS NOT NULL THEN CAST(p.sale_price AS DECIMAL) * ci.quantity
            ELSE CAST(p.price AS DECIMAL) * ci.quantity
          END
        ) as total_amount,
        MAX(ci.created_at) as last_activity
      FROM cart_items ci
      JOIN products p ON ci.product_id = p.id
      WHERE ci.session_id NOT IN (
          SELECT session_id FROM abandoned_carts
        )
      GROUP BY ci.session_id
      HAVING MAX(ci.created_at) < ${threshold}
    `);

    let count = 0;
    for (const row of staleCarts.rows as any[]) {
      try {
        await db.insert(abandonedCarts).values({
          sessionId: row.session_id,
          email: row.email || null,
          customerName: row.customer_name || null,
          phone: row.phone || null,
          productIds: row.product_ids,
          productTitles: row.product_titles,
          totalAmount: String(parseFloat(row.total_amount).toFixed(2)),
          recoveryEmailSent: false,
        });
        count++;
      } catch (e) {
        console.error("Error creating abandoned cart record:", e);
      }
    }

    return count;
  }

  async getAdminByUsername(username: string): Promise<AdminUser | undefined> {
    const [admin] = await db.select().from(adminUsers).where(eq(adminUsers.username, username));
    return admin;
  }

  async createAdminUser(admin: InsertAdminUser): Promise<AdminUser> {
    const [created] = await db.insert(adminUsers).values(admin).returning();
    return created;
  }

  async getAllPaymentSettings(): Promise<PaymentSetting[]> {
    return db.select().from(paymentSettings);
  }

  async getPaymentSetting(provider: string): Promise<PaymentSetting | undefined> {
    const [setting] = await db.select().from(paymentSettings).where(eq(paymentSettings.provider, provider));
    return setting;
  }

  async upsertPaymentSetting(setting: InsertPaymentSetting): Promise<PaymentSetting> {
    const existing = await this.getPaymentSetting(setting.provider);
    if (existing) {
      const [updated] = await db
        .update(paymentSettings)
        .set({ ...setting, updatedAt: new Date() })
        .where(eq(paymentSettings.provider, setting.provider))
        .returning();
      return updated;
    }
    const [created] = await db.insert(paymentSettings).values(setting).returning();
    return created;
  }

  async getAllTags(): Promise<Tag[]> {
    return db.select().from(tags);
  }

  async createTag(tag: InsertTag): Promise<Tag> {
    const [created] = await db.insert(tags).values(tag).returning();
    return created;
  }

  async deleteTag(id: string): Promise<void> {
    await db.delete(tags).where(eq(tags.id, id));
  }

  async getDashboardStats(): Promise<{
    totalRevenue: number;
    totalOrders: number;
    abandonedCartCount: number;
    conversionRate: number;
  }> {
    const ordersResult = await db.select({ 
      count: sql<number>`count(*)`,
      total: sql<number>`COALESCE(sum(amount), 0)`
    }).from(orders);
    
    const abandonedResult = await db.select({ 
      count: sql<number>`count(*)` 
    }).from(abandonedCarts);

    const totalOrders = Number(ordersResult[0].count) || 0;
    const totalRevenue = Number(ordersResult[0].total) || 0;
    const abandonedCartCount = Number(abandonedResult[0].count) || 0;
    const conversionRate = totalOrders + abandonedCartCount > 0 
      ? (totalOrders / (totalOrders + abandonedCartCount)) * 100 
      : 0;

    return { totalRevenue, totalOrders, abandonedCartCount, conversionRate };
  }

  async getSalesTrend(days: number): Promise<{ date: string; amount: number }[]> {
    const result = await db.execute(sql`
      SELECT 
        DATE(created_at) as date,
        COALESCE(SUM(amount), 0) as amount
      FROM orders
      WHERE created_at >= NOW() - INTERVAL '${sql.raw(days.toString())} days'
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `);
    
    return (result.rows as any[]).map(r => ({
      date: r.date,
      amount: Number(r.amount)
    }));
  }

  async createDownloadToken(token: InsertDownloadToken): Promise<DownloadToken> {
    const [created] = await db.insert(downloadTokens).values(token).returning();
    return created;
  }

  async getDownloadToken(token: string): Promise<DownloadToken | undefined> {
    const [result] = await db.select().from(downloadTokens).where(eq(downloadTokens.token, token));
    return result;
  }

  async incrementDownloadCount(token: string): Promise<void> {
    await db.update(downloadTokens)
      .set({ downloadCount: sql`download_count + 1` })
      .where(eq(downloadTokens.token, token));
  }

  async getProductsWithoutDownloadPath(): Promise<Product[]> {
    return db.select().from(products).where(
      or(
        eq(products.downloadPath, ''),
        sql`${products.downloadPath} IS NULL`
      )
    );
  }

  async updateProductDownloadPath(id: string, downloadPath: string): Promise<Product | undefined> {
    const [updated] = await db
      .update(products)
      .set({ downloadPath })
      .where(eq(products.id, id))
      .returning();
    return updated;
  }

  async bulkUpdateDownloadPaths(updates: { id: string; downloadPath: string }[]): Promise<void> {
    for (const { id, downloadPath } of updates) {
      await db.update(products).set({ downloadPath }).where(eq(products.id, id));
    }
  }

  async getAllConversations(): Promise<ChatConversationWithMessages[]> {
    const conversations = await db.select().from(chatConversations).orderBy(desc(chatConversations.lastMessageAt));
    
    const result: ChatConversationWithMessages[] = [];
    for (const conv of conversations) {
      const messages = await db.select().from(chatMessages).where(eq(chatMessages.conversationId, conv.id)).orderBy(chatMessages.createdAt);
      const unreadCount = messages.filter(m => !m.isRead && m.senderType === 'visitor').length;
      result.push({ ...conv, messages, unreadCount });
    }
    return result;
  }

  async getConversationById(id: string): Promise<ChatConversationWithMessages | undefined> {
    const [conversation] = await db.select().from(chatConversations).where(eq(chatConversations.id, id));
    if (!conversation) return undefined;
    
    const messages = await db.select().from(chatMessages).where(eq(chatMessages.conversationId, id)).orderBy(chatMessages.createdAt);
    const unreadCount = messages.filter(m => !m.isRead && m.senderType === 'visitor').length;
    return { ...conversation, messages, unreadCount };
  }

  async getConversationByVisitorId(visitorId: string): Promise<ChatConversation | undefined> {
    const [conversation] = await db.select().from(chatConversations)
      .where(and(eq(chatConversations.visitorId, visitorId), eq(chatConversations.status, 'active')));
    return conversation;
  }

  async createConversation(conversation: InsertChatConversation): Promise<ChatConversation> {
    const [created] = await db.insert(chatConversations).values(conversation).returning();
    return created;
  }

  async updateConversationStatus(id: string, status: string): Promise<ChatConversation | undefined> {
    const [updated] = await db.update(chatConversations).set({ status }).where(eq(chatConversations.id, id)).returning();
    return updated;
  }

  async getMessagesByConversationId(conversationId: string): Promise<ChatMessage[]> {
    return db.select().from(chatMessages).where(eq(chatMessages.conversationId, conversationId)).orderBy(chatMessages.createdAt);
  }

  async createMessage(message: InsertChatMessage): Promise<ChatMessage> {
    const [created] = await db.insert(chatMessages).values(message).returning();
    await db.update(chatConversations).set({ lastMessageAt: new Date() }).where(eq(chatConversations.id, message.conversationId));
    return created;
  }

  async markMessagesAsRead(conversationId: string, senderType: string): Promise<void> {
    await db.update(chatMessages)
      .set({ isRead: true })
      .where(and(eq(chatMessages.conversationId, conversationId), eq(chatMessages.senderType, senderType)));
  }

  async getUnreadMessageCount(): Promise<number> {
    const result = await db.select({ count: count() }).from(chatMessages)
      .where(and(eq(chatMessages.isRead, false), eq(chatMessages.senderType, 'visitor')));
    return result[0]?.count || 0;
  }

  async getAllBlogPosts(): Promise<BlogPost[]> {
    return db.select().from(blogPosts).orderBy(desc(blogPosts.createdAt));
  }

  async getPublishedBlogPosts(category?: string): Promise<BlogPost[]> {
    if (category) {
      return db.select().from(blogPosts).where(and(eq(blogPosts.published, true), eq(blogPosts.category, category))).orderBy(desc(blogPosts.createdAt));
    }
    return db.select().from(blogPosts).where(eq(blogPosts.published, true)).orderBy(desc(blogPosts.createdAt));
  }

  async getBlogPostBySlug(slug: string): Promise<BlogPost | undefined> {
    const [post] = await db.select().from(blogPosts).where(eq(blogPosts.slug, slug));
    return post;
  }

  async getBlogPostByProductId(productId: string): Promise<BlogPost | undefined> {
    const [post] = await db.select().from(blogPosts).where(eq(blogPosts.productId, productId));
    return post;
  }

  async createBlogPost(post: InsertBlogPost): Promise<BlogPost> {
    const [created] = await db.insert(blogPosts).values(post).returning();
    return created;
  }

  async updateBlogPost(id: string, post: Partial<InsertBlogPost>): Promise<BlogPost | undefined> {
    const [updated] = await db.update(blogPosts).set({ ...post, updatedAt: new Date() }).where(eq(blogPosts.id, id)).returning();
    return updated;
  }

  async deleteBlogPost(id: string): Promise<void> {
    await db.delete(blogPosts).where(eq(blogPosts.id, id));
  }

  async getBlogCategories(): Promise<{ name: string; count: number }[]> {
    const result = await db.execute(sql`
      SELECT category, COUNT(*) as count
      FROM blog_posts
      WHERE published = true AND category IS NOT NULL
      GROUP BY category
      ORDER BY count DESC
    `);
    return (result.rows as any[]).map(r => ({ name: r.category, count: Number(r.count) }));
  }
}

export const storage = new DatabaseStorage();
