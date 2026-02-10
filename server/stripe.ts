import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("Missing STRIPE_SECRET_KEY");
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function createStripePaymentIntent(
  amount: number,
  currency: string = "usd",
  metadata: Record<string, string> = {}
): Promise<Stripe.PaymentIntent> {
  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(amount * 100),
    currency,
    metadata,
    automatic_payment_methods: {
      enabled: true,
    },
  });
  return paymentIntent;
}

export { stripe };
