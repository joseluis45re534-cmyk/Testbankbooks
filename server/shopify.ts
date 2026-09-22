// Shopify Payments via Shopify-hosted checkout.
//
// Shopify Payments cannot be embedded in a non-Shopify site, so we create a
// Shopify *draft order* for the cart (custom line items — no product sync
// needed) and send the customer to its invoiceUrl, which is Shopify's hosted
// checkout. When it is paid, Shopify fires the `orders/paid` webhook and we
// create + deliver the order on our side.
//
// Auth: either a Dev Dashboard app (client ID + secret → client credentials
// grant, 24h tokens) or a legacy admin-created custom app token (shpat_...).

export const SHOPIFY_API_VERSION = "2026-07";

// Links a Shopify order back to our pending_checkouts row.
export const CHECKOUT_ATTRIBUTE_KEY = "tbb_checkout_id";

export type ShopifyConfig = {
  shopDomain: string;
  clientId: string | null;
  clientSecret: string | null;
  accessToken: string | null;
  webhookSecret: string | null;
};

export function normalizeShopDomain(input: string | null | undefined): string | null {
  if (!input) return null;
  let d = input.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  if (!d) return null;
  if (!d.includes(".")) d = `${d}.myshopify.com`;
  return /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(d) ? d : null;
}

export function isShopifyConfigured(cfg: ShopifyConfig | null): cfg is ShopifyConfig {
  return !!cfg && !!cfg.shopDomain && (!!cfg.accessToken || (!!cfg.clientId && !!cfg.clientSecret));
}

// Per-isolate token cache. Tokens last 24h; a cold isolate just fetches a new one.
const tokenCache = new Map<string, { token: string; expiresAt: number }>();

async function getAccessToken(cfg: ShopifyConfig): Promise<string> {
  if (cfg.accessToken) return cfg.accessToken;
  const cacheKey = `${cfg.shopDomain}:${cfg.clientId}`;
  const cached = tokenCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now() + 60_000) return cached.token;

  const res = await fetch(`https://${cfg.shopDomain}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: cfg.clientId!,
      client_secret: cfg.clientSecret!,
    }),
  });
  const data: any = await res.json().catch(() => ({}));
  if (!res.ok || !data.access_token) {
    throw new Error(`Shopify token request failed (${res.status}): ${data.error_description || data.error || "unknown error"}`);
  }
  tokenCache.set(cacheKey, {
    token: data.access_token,
    expiresAt: Date.now() + Number(data.expires_in || 86399) * 1000,
  });
  return data.access_token;
}

export async function shopifyGraphql<T = any>(
  cfg: ShopifyConfig,
  query: string,
  variables?: Record<string, unknown>,
): Promise<T> {
  const token = await getAccessToken(cfg);
  const res = await fetch(`https://${cfg.shopDomain}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": token },
    body: JSON.stringify({ query, variables }),
  });
  const body: any = await res.json().catch(() => ({}));
  if (!res.ok || body.errors) {
    const msg = Array.isArray(body.errors) ? body.errors.map((e: any) => e.message).join("; ") : body.errors || res.statusText;
    throw new Error(`Shopify API error (${res.status}): ${msg}`);
  }
  return body.data as T;
}

export async function getShopInfo(cfg: ShopifyConfig) {
  const data = await shopifyGraphql<{ shop: { name: string; currencyCode: string; enabledPresentmentCurrencies: string[] } }>(
    cfg,
    `query { shop { name currencyCode enabledPresentmentCurrencies } }`,
  );
  return data.shop;
}

export async function createDraftOrderCheckout(
  cfg: ShopifyConfig,
  input: {
    checkoutId: string;
    email: string;
    currency: string;
    lineItems: { title: string; unitPrice: string; quantity: number; sku?: string }[];
  },
): Promise<{ draftOrderId: string; invoiceUrl: string }> {
  const data = await shopifyGraphql(cfg, `
    mutation CreateCheckout($input: DraftOrderInput!) {
      draftOrderCreate(input: $input) {
        draftOrder { id invoiceUrl }
        userErrors { field message }
      }
    }`, {
    input: {
      email: input.email,
      presentmentCurrencyCode: input.currency,
      tags: ["nurstestbank", `tbb:${input.checkoutId}`],
      customAttributes: [{ key: CHECKOUT_ATTRIBUTE_KEY, value: input.checkoutId }],
      allowDiscountCodesInCheckout: false,
      lineItems: input.lineItems.map((li) => ({
        title: li.title.slice(0, 255),
        quantity: li.quantity,
        sku: li.sku,
        originalUnitPriceWithCurrency: { amount: li.unitPrice, currencyCode: input.currency },
        requiresShipping: false,
        taxable: false,
      })),
    },
  });
  const result = data.draftOrderCreate;
  if (result.userErrors?.length) {
    throw new Error(`Shopify draftOrderCreate: ${result.userErrors.map((e: any) => e.message).join("; ")}`);
  }
  if (!result.draftOrder?.invoiceUrl) throw new Error("Shopify draftOrderCreate returned no invoiceUrl");
  return { draftOrderId: result.draftOrder.id, invoiceUrl: result.draftOrder.invoiceUrl };
}

export async function registerOrdersPaidWebhook(cfg: ShopifyConfig, uri: string) {
  const data = await shopifyGraphql(cfg, `
    mutation RegisterWebhook($topic: WebhookSubscriptionTopic!, $sub: WebhookSubscriptionInput!) {
      webhookSubscriptionCreate(topic: $topic, webhookSubscription: $sub) {
        webhookSubscription { id }
        userErrors { field message }
      }
    }`, { topic: "ORDERS_PAID", sub: { uri } });
  const result = data.webhookSubscriptionCreate;
  const errors: string[] = (result.userErrors || []).map((e: any) => e.message);
  // Re-registering the same address is fine.
  const alreadyExists = errors.some((m) => /already been taken/i.test(m));
  if (errors.length && !alreadyExists) throw new Error(errors.join("; "));
  return { id: result.webhookSubscription?.id ?? null, alreadyExists };
}

/** Verify X-Shopify-Hmac-Sha256 (base64 HMAC-SHA256 of the raw body). */
export async function verifyShopifyWebhook(rawBody: ArrayBuffer, hmacHeader: string | undefined, secret: string | null): Promise<boolean> {
  if (!hmacHeader || !secret) return false;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, rawBody));
  let bin = "";
  for (let i = 0; i < sig.length; i++) bin += String.fromCharCode(sig[i]);
  const expected = btoa(bin);
  if (expected.length !== hmacHeader.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ hmacHeader.charCodeAt(i);
  return diff === 0;
}

/** Pull our checkout id out of an orders/paid payload (note attribute, falling back to tag). */
export function checkoutIdFromOrderPayload(payload: any): string | null {
  const attrs: any[] = payload?.note_attributes || [];
  const attr = attrs.find((a) => a?.name === CHECKOUT_ATTRIBUTE_KEY);
  if (attr?.value) return String(attr.value);
  const tags = String(payload?.tags || "").split(",").map((t) => t.trim());
  const tag = tags.find((t) => t.startsWith("tbb:"));
  return tag ? tag.slice(4) : null;
}
