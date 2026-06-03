type GtagItem = {
  item_id: string;
  item_name: string;
  item_category?: string;
  item_brand?: string;
  price?: number;
  quantity?: number;
};

type GtagFn = (
  command: string,
  eventName: string,
  params?: Record<string, unknown>
) => void;

declare global {
  interface Window {
    gtag?: GtagFn;
    dataLayer?: unknown[];
  }
}

function gtag(eventName: string, params?: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  if (typeof window.gtag === "function") {
    window.gtag("event", eventName, params || {});
  }
}

function priceOf(product: {
  price?: string | null;
  salePrice?: string | null;
}): number {
  const p = product.salePrice
    ? parseFloat(product.salePrice)
    : parseFloat(product.price || "0");
  return Number.isFinite(p) ? p : 0;
}

function toItem(
  product: {
    id: string;
    title: string;
    category?: string | null;
    brand?: string | null;
    price?: string | null;
    salePrice?: string | null;
  },
  quantity = 1
): GtagItem {
  return {
    item_id: product.id,
    item_name: product.title,
    item_category: product.category || undefined,
    item_brand: product.brand || undefined,
    price: priceOf(product),
    quantity,
  };
}

export const analytics = {
  viewItem(product: Parameters<typeof toItem>[0]) {
    const item = toItem(product);
    gtag("view_item", {
      currency: "USD",
      value: item.price,
      items: [item],
    });
  },

  addToCart(product: Parameters<typeof toItem>[0], quantity = 1) {
    const item = toItem(product, quantity);
    gtag("add_to_cart", {
      currency: "USD",
      value: (item.price || 0) * quantity,
      items: [item],
    });
  },

  beginCheckout(
    items: Array<{
      product: Parameters<typeof toItem>[0];
      quantity: number;
    }>,
    value: number
  ) {
    gtag("begin_checkout", {
      currency: "USD",
      value,
      items: items.map((i) => toItem(i.product, i.quantity)),
    });
  },

  purchase(args: {
    transactionId: string;
    value: number;
    items: Array<{
      product: Parameters<typeof toItem>[0];
      quantity: number;
    }>;
    paymentMethod?: string;
  }) {
    gtag("purchase", {
      transaction_id: args.transactionId,
      currency: "USD",
      value: args.value,
      payment_type: args.paymentMethod,
      items: args.items.map((i) => toItem(i.product, i.quantity)),
    });
  },
};
