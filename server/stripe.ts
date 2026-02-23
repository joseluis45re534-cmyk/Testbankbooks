import Stripe from "stripe";
import { getStripeKeys } from "./settingsHelper";

let cachedStripe: Stripe | null = null;
let cachedSecretKey: string | null = null;

export async function getStripeInstance(): Promise<Stripe> {
  const { secretKey } = await getStripeKeys();
  if (!secretKey) {
    throw new Error("Stripe secret key not configured. Set it in Admin Settings or as STRIPE_SECRET_KEY environment variable.");
  }
  if (cachedStripe && cachedSecretKey === secretKey) {
    return cachedStripe;
  }
  cachedStripe = new Stripe(secretKey);
  cachedSecretKey = secretKey;
  return cachedStripe;
}

export async function getStripePublishableKey(): Promise<string> {
  const { publishableKey } = await getStripeKeys();
  if (!publishableKey) {
    throw new Error("Stripe publishable key not configured.");
  }
  return publishableKey;
}

export async function createStripePaymentIntent(
  amount: number,
  currency: string = "usd",
  metadata: Record<string, string> = {}
): Promise<Stripe.PaymentIntent> {
  const stripe = await getStripeInstance();
  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(amount * 100),
    currency,
    metadata,
    automatic_payment_methods: {
      enabled: true,
    },
    payment_method_options: {
      link: {
        persistent_token: undefined,
      },
    },
  });
  return paymentIntent;
}
