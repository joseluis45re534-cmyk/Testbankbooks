import { storage } from "./express-storage";

// `enabled` is null when the admin has never saved this provider (no row), so
// callers fall back to "enabled if credentials exist" and env-only setups work.
async function getSettingFromDb(provider: string): Promise<{ config: Record<string, string>; enabled: boolean | null }> {
  try {
    const setting = await storage.getPaymentSetting(provider);
    if (setting) {
      return {
        config: setting.config ? JSON.parse(setting.config) : {},
        enabled: !!setting.enabled,
      };
    }
  } catch (e) {
    console.error(`Failed to read ${provider} config from DB:`, e);
  }
  return { config: {}, enabled: null };
}

export async function getStripeKeys(): Promise<{ secretKey: string | null; publishableKey: string | null; configured: boolean; enabled: boolean }> {
  const { config, enabled } = await getSettingFromDb("stripe");
  const secretKey = config.secretKey || process.env.STRIPE_SECRET_KEY || null;
  const publishableKey = config.publishableKey || process.env.STRIPE_PUBLISHABLE_KEY || null;
  const configured = !!(secretKey && publishableKey);
  return { secretKey, publishableKey, configured, enabled: enabled ?? configured };
}

export async function getPaypalKeys(): Promise<{ clientId: string | null; clientSecret: string | null; configured: boolean; enabled: boolean }> {
  const { config, enabled } = await getSettingFromDb("paypal");
  const clientId = config.clientId || process.env.PAYPAL_CLIENT_ID || null;
  const clientSecret = config.clientSecret || process.env.PAYPAL_CLIENT_SECRET || null;
  const configured = !!(clientId && clientSecret);
  return { clientId, clientSecret, configured, enabled: enabled ?? configured };
}
