// PayPal integration using the standard PayPal JS SDK (paypal.Buttons).
// This replaces the fragile web-sdk/v6 beta flow. It loads the SDK with the
// merchant clientId, renders the official PayPal button, and wires
// createOrder -> POST /paypal/order and onApprove -> POST /paypal/order/:id/capture.
import { useEffect, useRef, useState } from "react";

interface ShippingAddress {
  address1: string;
  address2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

interface PayPalButtonProps {
  amount: string;
  currency: string;
  intent: string;
  customerEmail?: string;
  customerName?: string;
  phone?: string;
  shippingAddress?: ShippingAddress;
  onPaymentSuccess?: (orderId: string, captureData: any) => void;
  onPaymentError?: (error: any) => void;
}

const SDK_SCRIPT_ID = "paypal-sdk";

function loadPayPalSdk(clientId: string, currency: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const w = window as any;
    // Already loaded with the right client — reuse it.
    if (w.paypal) {
      resolve(w.paypal);
      return;
    }
    const existing = document.getElementById(SDK_SCRIPT_ID) as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener("load", () => resolve((window as any).paypal));
      existing.addEventListener("error", reject);
      return;
    }
    const script = document.createElement("script");
    script.id = SDK_SCRIPT_ID;
    script.src =
      `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(clientId)}` +
      `&currency=${encodeURIComponent(currency)}&intent=capture&components=buttons&disable-funding=credit,card`;
    script.async = true;
    script.onload = () => resolve((window as any).paypal);
    script.onerror = reject;
    document.body.appendChild(script);
  });
}

export default function PayPalButton({
  amount,
  currency,
  intent,
  customerEmail,
  customerName,
  phone,
  shippingAddress,
  onPaymentSuccess,
  onPaymentError,
}: PayPalButtonProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Keep latest values in refs so the PayPal callbacks (created once) always
  // read current props without re-rendering the button.
  const dataRef = useRef({ customerEmail, customerName, phone, shippingAddress });
  dataRef.current = { customerEmail, customerName, phone, shippingAddress };

  useEffect(() => {
    let cancelled = false;
    let buttonsInstance: any = null;

    (async () => {
      try {
        const setupRes = await fetch("/paypal/setup");
        if (!setupRes.ok) throw new Error("PayPal is not configured");
        const { clientId } = await setupRes.json();
        if (!clientId) throw new Error("PayPal client ID missing");

        const paypal = await loadPayPalSdk(clientId, currency || "USD");
        if (cancelled || !paypal || !containerRef.current) return;

        buttonsInstance = paypal.Buttons({
          style: { layout: "vertical", color: "blue", shape: "rect", label: "paypal" },

          createOrder: async () => {
            const res = await fetch("/paypal/order", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ amount, currency, intent }),
            });
            const data = await res.json();
            if (!res.ok || !data.id) {
              throw new Error(data.error || "Failed to create PayPal order");
            }
            return data.id;
          },

          onApprove: async (data: any) => {
            try {
              const d = dataRef.current;
              const res = await fetch(`/paypal/order/${data.orderID}/capture`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  customerEmail: d.customerEmail,
                  customerName: d.customerName,
                  phone: d.phone,
                  shippingAddress: d.shippingAddress,
                }),
              });
              const captureData = await res.json();
              if (!res.ok) {
                throw new Error(captureData.error || "Failed to capture PayPal payment");
              }
              onPaymentSuccess?.(data.orderID, captureData);
            } catch (err) {
              console.error("PayPal capture failed:", err);
              onPaymentError?.(err);
            }
          },

          onError: (err: any) => {
            console.error("PayPal error:", err);
            setError("PayPal encountered an error. Please try again or use a card.");
            onPaymentError?.(err);
          },

          onCancel: () => {
            // Visitor closed the PayPal window — no action needed.
          },
        });

        if (buttonsInstance.isEligible()) {
          buttonsInstance.render(containerRef.current);
        } else {
          setError("PayPal is not available for this purchase.");
        }
      } catch (err: any) {
        console.error("PayPal init failed:", err);
        setError(err?.message || "Could not load PayPal. Please try a card instead.");
      }
    })();

    return () => {
      cancelled = true;
      try { buttonsInstance?.close?.(); } catch {}
    };
    // Re-init only if the currency changes (clientId/SDK depend on it).
  }, [currency]);

  return (
    <div className="w-full">
      <div ref={containerRef} data-testid="button-paypal-pay" />
      {error && (
        <p className="text-sm text-destructive mt-2" data-testid="text-paypal-error">{error}</p>
      )}
    </div>
  );
}
