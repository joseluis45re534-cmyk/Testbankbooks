import { storage } from "./storage";

async function getConfigFromDb(provider: string): Promise<Record<string, string>> {
  try {
    const setting = await storage.getPaymentSetting(provider);
    if (setting?.config) {
      return JSON.parse(setting.config);
    }
  } catch (e) {
    console.error(`Failed to read ${provider} config from DB:`, e);
  }
  return {};
}

export async function getStripeKeys(): Promise<{ secretKey: string | null; publishableKey: string | null }> {
  const dbConfig = await getConfigFromDb("stripe");
  return {
    secretKey: dbConfig.secretKey || process.env.STRIPE_SECRET_KEY || null,
    publishableKey: dbConfig.publishableKey || process.env.STRIPE_PUBLISHABLE_KEY || null,
  };
}

export async function getPaypalKeys(): Promise<{ clientId: string | null; clientSecret: string | null }> {
  const dbConfig = await getConfigFromDb("paypal");
  return {
    clientId: dbConfig.clientId || process.env.PAYPAL_CLIENT_ID || null,
    clientSecret: dbConfig.clientSecret || process.env.PAYPAL_CLIENT_SECRET || null,
  };
}
