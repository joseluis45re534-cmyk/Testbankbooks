import { db } from "./db";
import { products, cartItems, type Product, type InsertProduct, type CartItem, type InsertCartItem, type CartItemWithProduct } from "@shared/schema";
import { eq, ilike, or, and, sql } from "drizzle-orm";

export interface IStorage {
  getAllProducts(): Promise<Product[]>;
  getProductsBySearch(search: string, category?: string | null): Promise<Product[]>;
  getProductBySlug(slug: string): Promise<Product | undefined>;
  getProductById(id: string): Promise<Product | undefined>;
  insertProduct(product: InsertProduct): Promise<Product>;
  insertProducts(productList: InsertProduct[]): Promise<void>;
  clearAllProducts(): Promise<void>;
  getCartItems(sessionId: string): Promise<CartItemWithProduct[]>;
  addToCart(item: InsertCartItem): Promise<CartItem>;
  updateCartItemQuantity(itemId: string, quantity: number): Promise<CartItem | undefined>;
  removeCartItem(itemId: string): Promise<void>;
  clearCart(sessionId: string): Promise<void>;
  getProductCount(): Promise<number>;
  getCategories(): Promise<{ name: string; count: number }[]>;
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

  async insertProducts(productList: InsertProduct[]): Promise<void> {
    const productsWithSlugs = productList.map((p, index) => ({
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
}

export const storage = new DatabaseStorage();
