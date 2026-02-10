import crypto from "crypto";

interface WooCommerceConfig {
  url: string;
  consumerKey: string;
  consumerSecret: string;
}

interface DownloadableFile {
  id: string;
  name: string;
  file: string;
}

interface WooProduct {
  id: number;
  name: string;
  downloadable: boolean;
  downloads: DownloadableFile[];
}

export class WooCommerceAPI {
  private config: WooCommerceConfig;

  constructor(config: WooCommerceConfig) {
    this.config = config;
  }

  private getAuthHeader(): string {
    const credentials = Buffer.from(
      `${this.config.consumerKey}:${this.config.consumerSecret}`
    ).toString("base64");
    return `Basic ${credentials}`;
  }

  async getProduct(productId: string): Promise<WooProduct | null> {
    try {
      const url = `${this.config.url}/wp-json/wc/v3/products/${productId}`;
      const response = await fetch(url, {
        headers: {
          Authorization: this.getAuthHeader(),
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        console.error(`WooCommerce API error: ${response.status}`);
        return null;
      }

      return await response.json();
    } catch (error) {
      console.error("Failed to fetch WooCommerce product:", error);
      return null;
    }
  }

  async getDownloadableFiles(productId: string): Promise<DownloadableFile[]> {
    const product = await this.getProduct(productId);
    if (!product || !product.downloadable) {
      return [];
    }
    return product.downloads || [];
  }

  async fetchAllProducts(page: number = 1, perPage: number = 100): Promise<WooProduct[]> {
    try {
      const url = `${this.config.url}/wp-json/wc/v3/products?page=${page}&per_page=${perPage}`;
      const response = await fetch(url, {
        headers: {
          Authorization: this.getAuthHeader(),
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        console.error(`WooCommerce API error: ${response.status}`);
        return [];
      }

      return await response.json();
    } catch (error) {
      console.error("Failed to fetch WooCommerce products:", error);
      return [];
    }
  }
}

export function generateSecureToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function generateSignedUrl(token: string, expiresAt: Date): string {
  const timestamp = Math.floor(expiresAt.getTime() / 1000);
  const signature = crypto
    .createHmac("sha256", process.env.SESSION_SECRET || "fallback-secret")
    .update(`${token}:${timestamp}`)
    .digest("hex")
    .substring(0, 16);
  
  return `${token}.${timestamp}.${signature}`;
}

export function verifySignedUrl(signedToken: string): { valid: boolean; token: string } {
  try {
    const parts = signedToken.split(".");
    if (parts.length !== 3) {
      return { valid: false, token: "" };
    }

    const [token, timestampStr, providedSignature] = parts;
    const timestamp = parseInt(timestampStr, 10);
    
    if (isNaN(timestamp) || Date.now() / 1000 > timestamp) {
      return { valid: false, token: "" };
    }

    const expectedSignature = crypto
      .createHmac("sha256", process.env.SESSION_SECRET || "fallback-secret")
      .update(`${token}:${timestamp}`)
      .digest("hex")
      .substring(0, 16);

    if (providedSignature !== expectedSignature) {
      return { valid: false, token: "" };
    }

    return { valid: true, token };
  } catch {
    return { valid: false, token: "" };
  }
}

export function createWooCommerceAPI(): WooCommerceAPI | null {
  const url = process.env.WC_URL;
  const consumerKey = process.env.WC_KEY;
  const consumerSecret = process.env.WC_SECRET;

  if (!url || !consumerKey || !consumerSecret) {
    console.log("WooCommerce API credentials not configured");
    return null;
  }

  return new WooCommerceAPI({
    url,
    consumerKey,
    consumerSecret,
  });
}

