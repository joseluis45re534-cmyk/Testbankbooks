import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  DEFAULT_MULTIBUY_CONFIG, priceCart, offerLabel, ordinal, type MultibuyConfig, type CartPricing,
} from "@shared/multibuy";
import type { CartItemWithProduct } from "@shared/schema";

// The multi-buy offer as the server applies it. Until it loads (or if it
// fails) the offer counts as off, which only ever shows a higher price.
export function useMultibuyConfig(): MultibuyConfig {
  const { data } = useQuery<MultibuyConfig>({
    queryKey: ["/api/promo"],
    staleTime: 5 * 60 * 1000,
  });
  return data ?? DEFAULT_MULTIBUY_CONFIG;
}

export function useCartPricing(cartItems: CartItemWithProduct[]) {
  const promo = useMultibuyConfig();
  const pricing = useMemo(() => priceCart(cartItems, promo), [cartItems, promo]);
  const lineFor = (itemId: string) => pricing.lines.find((l) => l.itemId === itemId);
  return { promo, pricing, lineFor };
}

// The ladder to show customers: rank 1 (full price) through the last rank
// that has a discount.
export function offerSteps(promo: MultibuyConfig) {
  let last = 0;
  promo.tiers.forEach((t, i) => { if (t > 0) last = i; });
  return promo.tiers.slice(0, last + 1).map((percent, i) => ({
    position: i + 1,
    ordinal: ordinal(i + 1),
    percent,
    label: i === 0 ? "Full price" : offerLabel(percent),
  }));
}

// One line telling the customer where they are on the ladder.
export function offerProgress(pricing: CartPricing): string | null {
  const next = pricing.nextTier;
  const saving = pricing.discount > 0 ? `You're saving $${pricing.discount.toFixed(2)}. ` : "";
  if (next) {
    const reward = next.percent >= 100 ? "get it FREE" : `get ${next.percent}% off it`;
    return `${saving}Add a ${ordinal(next.position)} item and ${reward}.`;
  }
  if (pricing.discount > 0) return `${saving}You've unlocked the biggest discount.`;
  return null;
}
