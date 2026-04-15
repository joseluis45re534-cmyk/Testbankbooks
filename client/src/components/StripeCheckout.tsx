import { useState, useEffect, useRef, useCallback } from "react";
import { loadStripe, type Stripe, type StripeElements } from "@stripe/stripe-js";
import { Button } from "@/components/ui/button";
import { Loader2, CreditCard } from "lucide-react";

let stripePromise: Promise<Stripe | null> | null = null;

function getStripe() {
  if (!stripePromise) {
    stripePromise = fetch("/api/stripe/config")
      .then((res) => res.json())
      .then((data) => loadStripe(data.publishableKey));
  }
  return stripePromise;
}

interface StripeCheckoutProps {
  amount: string;
  customerEmail: string;
  customerName?: string;
  phone?: string;
  onPaymentSuccess: (paymentIntentId: string, orderData: any) => void;
  onPaymentError: (error: any) => void;
}

export default function StripeCheckout({
  amount,
  customerEmail,
  customerName,
  phone,
  onPaymentSuccess,
  onPaymentError,
}: StripeCheckoutProps) {
  const [stripe, setStripe] = useState<Stripe | null>(null);
  const [elements, setElements] = useState<StripeElements | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [cardError, setCardError] = useState<string | null>(null);
  const mountedRef = useRef(false);
  const stripeContainerRef = useRef<HTMLDivElement | null>(null);
  const elementsRef = useRef<StripeElements | null>(null);

  const mountPointRef = useCallback((node: HTMLDivElement | null) => {
    if (node && !stripeContainerRef.current) {
      stripeContainerRef.current = node;
      if (!mountedRef.current) {
        mountedRef.current = true;
        initStripe(node);
      }
    }
  }, []);

  const initStripe = async (container: HTMLDivElement) => {
    try {
      const [stripeInstance, intentRes] = await Promise.all([
        getStripe(),
        fetch("/api/stripe/create-payment-intent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ customerEmail }),
          credentials: "include",
        }),
      ]);

      if (!intentRes.ok) {
        const err = await intentRes.json().catch(() => ({}));
        throw new Error(err.error || "Failed to create payment intent");
      }

      const { clientSecret: secret } = await intentRes.json();

      if (stripeInstance && secret) {
        setStripe(stripeInstance);

        const elementsInstance = stripeInstance.elements({
          clientSecret: secret,
          appearance: {
            theme: "stripe",
            variables: {
              colorPrimary: "#2563eb",
              borderRadius: "6px",
            },
          },
        });

        const paymentElement = elementsInstance.create("payment", {
          layout: {
            type: "tabs",
            defaultCollapsed: false,
          },
          wallets: {
            applePay: "auto",
            googlePay: "auto",
          },
          paymentMethodOrder: ["card", "apple_pay", "google_pay", "link"],
          defaultValues: {
            billingDetails: {
              email: customerEmail,
              name: customerName || undefined,
              phone: phone || undefined,
            },
          },
        });
        paymentElement.mount(container);
        elementsRef.current = elementsInstance;

        paymentElement.on("change", (event) => {
          if (event.complete) {
            setCardError(null);
          }
        });

        setElements(elementsInstance);
      }

      setLoading(false);
    } catch (error) {
      console.error("Stripe init error:", error);
      setCardError("Failed to initialize payment. Please try again.");
      setLoading(false);
    }
  };

  useEffect(() => {
    return () => {
      if (elementsRef.current) {
        const pe = elementsRef.current.getElement("payment");
        if (pe) {
          try { pe.unmount(); } catch (e) {}
        }
      }
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) return;

    setProcessing(true);
    setCardError(null);

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          receipt_email: customerEmail,
          return_url: window.location.origin + "/checkout",
        },
        redirect: "if_required",
      });

      if (error) {
        setCardError(error.message || "Payment failed");
        setProcessing(false);
        return;
      }

      if (paymentIntent && paymentIntent.status === "succeeded") {
        const confirmRes = await fetch("/api/stripe/confirm-payment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            paymentIntentId: paymentIntent.id,
            customerEmail,
            customerName,
            phone,
          }),
          credentials: "include",
        });

        if (!confirmRes.ok) {
          const err = await confirmRes.json().catch(() => ({}));
          throw new Error(err.error || "Failed to confirm payment");
        }

        const orderData = await confirmRes.json();
        onPaymentSuccess(paymentIntent.id, orderData);
      } else {
        setCardError("Payment was not completed. Please try again.");
      }
    } catch (error: any) {
      console.error("Payment error:", error);
      setCardError(error.message || "Payment failed");
      onPaymentError(error);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {loading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      )}
      <div ref={mountPointRef} style={{ display: loading ? "none" : "block" }} />

      {cardError && (
        <p className="text-sm text-destructive" data-testid="text-stripe-error">{cardError}</p>
      )}

      <Button
        type="submit"
        className="w-full"
        size="lg"
        disabled={!stripe || !elements || processing || loading}
        data-testid="button-stripe-pay"
      >
        {processing ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Processing...
          </>
        ) : (
          <>
            <CreditCard className="w-4 h-4 mr-2" />
            Pay ${amount}
          </>
        )}
      </Button>
    </form>
  );
}
