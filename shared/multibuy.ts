// Multi-buy offer: the more items in the cart, the bigger the discount on the
// lower-priced ones. Items are ranked by price, most expensive first, and the
// item at rank i gets tiers[i] percent off. Rank 1 is always full price, and
// ranks past the last tier are full price too.
//
// This is the one place cart totals are worked out. The cart and checkout
// pages and every payment path on the server use it, so the amount a customer
// sees is the amount they are charged and the amount the webhooks expect.

export const MULTIBUY_SETTING_KEY = "multibuy_promo";
export const MAX_MULTIBUY_TIERS = 10;

export type MultibuyConfig = { enabled: boolean; tiers: number[] };

export const DEFAULT_MULTIBUY_CONFIG: MultibuyConfig = {
  enabled: false,
  tiers: [0, 20, 30, 50, 60, 100],
};

// Reads the saved setting. Anything missing or malformed means "offer off",
// so a bad value can never discount an order by accident.
export function parseMultibuyConfig(raw: string | null | undefined): MultibuyConfig {
  const off = { ...DEFAULT_MULTIBUY_CONFIG, tiers: [...DEFAULT_MULTIBUY_CONFIG.tiers] };
  if (!raw) return off;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.tiers) || parsed.tiers.length < 2) return off;
    const tiers = parsed.tiers.slice(0, MAX_MULTIBUY_TIERS).map((t: unknown) => {
      const n = Math.round(Number(t));
      return Number.isFinite(n) ? Math.min(100, Math.max(0, n)) : 0;
    });
    tiers[0] = 0;
    return { enabled: parsed.enabled === true, tiers };
  } catch {
    return off;
  }
}

type PricedProduct = { id: string; title: string; price: string; salePrice?: string | null };
type CartLine = { id: string; quantity: number; product?: PricedProduct | null };

export function unitPrice(product: { price: string; salePrice?: string | null }): number {
  const n = product.salePrice ? parseFloat(product.salePrice) : parseFloat(product.price);
  return Number.isFinite(n) ? n : 0;
}

export type PricedLine = {
  itemId: string;
  productId: string;
  title: string;
  unitPrice: number;
  quantity: number;
  percentOff: number;
  discount: number;
  lineTotal: number;
};

export type CartPricing = {
  lines: PricedLine[];
  subtotal: number;
  discount: number;
  total: number;
  itemCount: number;
  // The tier the next added item would get, or null when there is none left.
  nextTier: { position: number; percent: number } | null;
};

const toCents = (n: number) => Math.round(n * 100);

export function priceCart(items: CartLine[], config: MultibuyConfig): CartPricing {
  const rows = items
    .filter((i): i is CartLine & { product: PricedProduct } => !!i.product)
    .map((i) => ({ item: i, unitCents: toCents(unitPrice(i.product)), quantity: Math.max(1, i.quantity || 1) }));

  // One rank per cart line, highest price first. Ties go by cart-item id so the
  // client and the server always pick the same line.
  const ranked = [...rows].sort((a, b) =>
    b.unitCents - a.unitCents || (a.item.id < b.item.id ? -1 : a.item.id > b.item.id ? 1 : 0));
  const percentByItem = new Map<string, number>();
  ranked.forEach((r, rank) => {
    percentByItem.set(r.item.id, config.enabled ? config.tiers[rank] ?? 0 : 0);
  });

  let subtotalCents = 0;
  let discountCents = 0;
  // Lines keep the cart's own order for display.
  const lines: PricedLine[] = rows.map((r) => {
    const percentOff = percentByItem.get(r.item.id) ?? 0;
    // Only one unit of a line gets the tier; extra copies are full price.
    const lineDiscount = Math.round((r.unitCents * percentOff) / 100);
    const lineCents = r.unitCents * r.quantity;
    subtotalCents += lineCents;
    discountCents += lineDiscount;
    return {
      itemId: r.item.id,
      productId: r.item.product.id,
      title: r.item.product.title,
      unitPrice: r.unitCents / 100,
      quantity: r.quantity,
      percentOff,
      discount: lineDiscount / 100,
      lineTotal: (lineCents - lineDiscount) / 100,
    };
  });

  const nextPercent = config.enabled ? config.tiers[rows.length] : undefined;
  return {
    lines,
    subtotal: subtotalCents / 100,
    discount: discountCents / 100,
    total: (subtotalCents - discountCents) / 100,
    itemCount: rows.length,
    nextTier: nextPercent ? { position: rows.length + 1, percent: nextPercent } : null,
  };
}

// "20% off", or "FREE" for a 100% tier.
export function offerLabel(percent: number): string {
  return percent >= 100 ? "FREE" : `${percent}% off`;
}

// 1st, 2nd, 3rd, 4th ...
export function ordinal(n: number): string {
  const tens = n % 100;
  if (tens >= 11 && tens <= 13) return `${n}th`;
  return `${n}${["th", "st", "nd", "rd"][n % 10] ?? "th"}`;
}
