import { useEffect, useRef, useState } from "react";
import { ExternalLink, Loader2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ShopifyCheckoutProps {
  amount: string;
  customerEmail: string;
  customerName: string;
  phone: string;
  onPaymentSuccess: (orderId: string) => void;
  onPaymentError: (error: unknown) => void;
  onCheckoutStarted?: () => void;
}

const POLL_INTERVAL_MS = 3000;

// Shopify Payments only runs on Shopify's hosted checkout. We open it in a new
// tab and poll our API until Shopify's orders/paid webhook has created the
// order, then hand off to the thank-you page in this tab.
export default function ShopifyCheckout({
  amount,
  customerEmail,
  customerName,
  phone,
  onPaymentSuccess,
  onPaymentError,
  onCheckoutStarted,
}: ShopifyCheckoutProps) {
  const [isStarting, setIsStarting] = useState(false);
  const [checkout, setCheckout] = useState<{ id: string; url: string } | null>(null);
  const [mismatch, setMismatch] = useState(false);
  const doneRef = useRef(false);

  useEffect(() => {
    if (!checkout) return;
    let stopped = false;
    const poll = async () => {
      try {
        const res = await fetch(`/api/shopify/checkout/${checkout.id}/status`, { credentials: "include" });
        if (res.ok) {
          const data: any = await res.json();
          if (data.status === "paid" && data.orderId && !doneRef.current) {
            doneRef.current = true;
            onPaymentSuccess(data.orderId);
            return;
          }
          if (data.status === "amount_mismatch") {
            setMismatch(true);
            return;
          }
        }
      } catch {
        // transient — keep polling
      }
      if (!stopped) timer = window.setTimeout(poll, POLL_INTERVAL_MS);
    };
    let timer = window.setTimeout(poll, POLL_INTERVAL_MS);
    return () => {
      stopped = true;
      window.clearTimeout(timer);
    };
  }, [checkout, onPaymentSuccess]);

  const startCheckout = async () => {
    // Open the tab synchronously inside the click so popup blockers allow it.
    const payWindow = window.open("", "_blank");
    setIsStarting(true);
    try {
      const res = await fetch("/api/shopify/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ customerEmail, customerName, phone }),
      });
      const data: any = await res.json();
      if (!res.ok || !data.checkoutUrl) throw new Error(data.error || "Could not start checkout");

      setCheckout({ id: data.checkoutId, url: data.checkoutUrl });
      onCheckoutStarted?.();
      if (payWindow) {
        payWindow.opener = null;
        payWindow.location.href = data.checkoutUrl;
      } else {
        // Popup blocked — pay in this tab; the confirmation email carries the download link.
        window.location.href = data.checkoutUrl;
      }
    } catch (error) {
      payWindow?.close();
      onPaymentError(error);
    } finally {
      setIsStarting(false);
    }
  };

  if (mismatch) {
    return (
      <div className="rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm">
        We received your payment but couldn't match it to this order automatically. Please contact{" "}
        <a className="underline" href="mailto:support@nurstestbank.com">support@nurstestbank.com</a> with your
        Shopify order number and we'll deliver your files right away.
      </div>
    );
  }

  if (checkout) {
    return (
      <div className="space-y-4 text-center" data-testid="shopify-waiting">
        <div className="flex items-center justify-center gap-2 text-sm font-medium">
          <Loader2 className="w-4 h-4 animate-spin" />
          Waiting for payment confirmation…
        </div>
        <p className="text-sm text-muted-foreground">
          Complete your payment in the Shopify checkout tab. This page updates automatically once your payment is
          confirmed, and your download link is also emailed to {customerEmail}.
        </p>
        <Button variant="outline" asChild>
          <a href={checkout.url} target="_blank" rel="noopener noreferrer" data-testid="link-reopen-shopify">
            <ExternalLink className="w-4 h-4 mr-2" />
            Reopen payment page
          </a>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3 text-center">
      <p className="text-sm text-muted-foreground">
        You'll complete your ${amount} payment on Shopify's secure checkout page, which opens in a new tab.
      </p>
      <Button
        type="button"
        size="lg"
        className="w-full"
        onClick={startCheckout}
        disabled={isStarting || !customerEmail}
        data-testid="button-pay-shopify"
      >
        {isStarting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Lock className="w-4 h-4 mr-2" />}
        Pay ${amount} securely
      </Button>
    </div>
  );
}
