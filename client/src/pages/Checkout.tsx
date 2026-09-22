import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { ArrowLeft, Shield, Zap, CheckCircle, CreditCard, Lock, Loader2 } from "lucide-react";
import { SiPaypal, SiShopify } from "react-icons/si";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { SEO } from "@/components/SEO";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useMemo, useState } from "react";
import { queryClient } from "@/lib/queryClient";
import { analytics } from "@/lib/analytics";
import type { CartItemWithProduct } from "@shared/schema";
import PayPalButton from "@/components/PayPalButton";
import StripeCheckout from "@/components/StripeCheckout";
import ShopifyCheckout from "@/components/ShopifyCheckout";

type PaymentMethod = "stripe" | "paypal" | "shopify";

const PAYMENT_TILES: { id: PaymentMethod; label: string; icon: JSX.Element }[] = [
  { id: "stripe", label: "Card / Wallet", icon: <CreditCard className="w-5 h-5" /> },
  { id: "paypal", label: "PayPal / Card", icon: <SiPaypal className="w-5 h-5 text-[#00457C]" /> },
  { id: "shopify", label: "Shopify Checkout", icon: <SiShopify className="w-5 h-5 text-[#95BF47]" /> },
];

const CHECKOUT_INFO_KEY = "checkout_contact_info";

type SavedCheckoutInfo = {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  paymentMethod?: PaymentMethod;
  step?: number;
};

// Contact details survive a page refresh (and a trip to an external payment
// page) so the customer never has to retype them.
function loadSavedCheckoutInfo(): SavedCheckoutInfo {
  try {
    const saved = localStorage.getItem(CHECKOUT_INFO_KEY);
    return saved ? (JSON.parse(saved) as SavedCheckoutInfo) : {};
  } catch {
    return {};
  }
}

function hasCompleteContact(info: SavedCheckoutInfo): boolean {
  return !!(info.firstName?.trim() && info.lastName?.trim() && info.email?.trim());
}

// Keep the saved contact details but send the next checkout back to step 1.
function forgetSavedStep() {
  try {
    localStorage.setItem(CHECKOUT_INFO_KEY, JSON.stringify({ ...loadSavedCheckoutInfo(), step: 1 }));
  } catch {
    /* storage unavailable */
  }
}

export default function Checkout() {
  const [savedInfo] = useState(loadSavedCheckoutInfo);
  const [step, setStep] = useState(savedInfo.step === 2 && hasCompleteContact(savedInfo) ? 2 : 1);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [email, setEmail] = useState(savedInfo.email ?? "");
  const [firstName, setFirstName] = useState(savedInfo.firstName ?? "");
  const [lastName, setLastName] = useState(savedInfo.lastName ?? "");
  const [phone, setPhone] = useState(savedInfo.phone ?? "");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(savedInfo.paymentMethod ?? "stripe");
  const [serverAmount, setServerAmount] = useState<string | null>(null);
  // Set once a Shopify checkout tab is open: the webhook clears the cart, and
  // we must keep this page (and its status polling) mounted until redirect.
  const [shopifyInProgress, setShopifyInProgress] = useState(false);

  const { data: paymentMethods } = useQuery<Record<PaymentMethod, boolean>>({
    queryKey: ["/api/payment-methods"],
    staleTime: 60_000,
  });
  const availableMethods = useMemo(
    () => PAYMENT_TILES.map((t) => t.id).filter((id) => !!paymentMethods?.[id]),
    [paymentMethods],
  );
  // Render from a method we know is offered, so a restored-but-since-disabled
  // choice never shows a checkout form that cannot work.
  const activeMethod = availableMethods.includes(paymentMethod) ? paymentMethod : availableMethods[0];

  useEffect(() => {
    try {
      localStorage.setItem(
        CHECKOUT_INFO_KEY,
        JSON.stringify({ firstName, lastName, email, phone, paymentMethod, step }),
      );
    } catch {
      /* storage unavailable (private mode, blocked cookies) — form still works */
    }
  }, [firstName, lastName, email, phone, paymentMethod, step]);

  // Keep the stored choice in step with what the admin panel currently offers.
  useEffect(() => {
    if (activeMethod && activeMethod !== paymentMethod) setPaymentMethod(activeMethod);
  }, [activeMethod, paymentMethod]);

  const { data: cartItems = [], isLoading } = useQuery<CartItemWithProduct[]>({
    queryKey: ["/api/cart"],
    refetchOnMount: "always",
    staleTime: 0,
  });

  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = cartItems.reduce((sum, item) => {
    const price = item.product?.salePrice ? parseFloat(item.product.salePrice) : parseFloat(item.product?.price || "0");
    return sum + price * item.quantity;
  }, 0);

  const handlePayPalSuccess = async (paypalOrderId: string, captureData: any) => {
    try {
      if (captureData.status !== "COMPLETED" || !captureData.internalOrder) {
        toast({
          title: "Payment Not Completed",
          description: "Your payment was not completed. Please try again.",
          variant: "destructive",
        });
        return;
      }

      queryClient.invalidateQueries({ queryKey: ["/api/cart"] });

      analytics.purchase({
        transactionId: captureData.internalOrder.id,
        value: subtotal,
        items: cartItems
          .filter((i) => !!i.product)
          .map((i) => ({ product: i.product!, quantity: i.quantity })),
        paymentMethod: "paypal",
      });

      toast({
        title: "Payment Successful",
        description: "Your order has been placed successfully!",
      });

      forgetSavedStep();
      setLocation(`/thank-you/${captureData.internalOrder.id}`);
    } catch (error) {
      console.error("Order handling failed:", error);
      toast({
        title: "Order Error",
        description: "Payment was received but there was an issue. Please contact support.",
        variant: "destructive",
      });
    }
  };

  const handleStripeSuccess = async (paymentIntentId: string, orderData: any) => {
    try {
      if (!orderData.order) {
        toast({
          title: "Payment Error",
          description: "Payment processed but order creation failed. Please contact support.",
          variant: "destructive",
        });
        return;
      }

      queryClient.invalidateQueries({ queryKey: ["/api/cart"] });

      analytics.purchase({
        transactionId: orderData.order.id,
        value: subtotal,
        items: cartItems
          .filter((i) => !!i.product)
          .map((i) => ({ product: i.product!, quantity: i.quantity })),
        paymentMethod: "stripe",
      });

      toast({
        title: "Payment Successful",
        description: "Your order has been placed successfully!",
      });

      forgetSavedStep();
      setLocation(`/thank-you/${orderData.order.id}`);
    } catch (error) {
      console.error("Order handling failed:", error);
      toast({
        title: "Order Error",
        description: "Payment was received but there was an issue. Please contact support.",
        variant: "destructive",
      });
    }
  };

  const handleShopifySuccess = (orderId: string) => {
    queryClient.invalidateQueries({ queryKey: ["/api/cart"] });
    analytics.purchase({
      transactionId: orderId,
      value: subtotal,
      items: cartItems
        .filter((i) => !!i.product)
        .map((i) => ({ product: i.product!, quantity: i.quantity })),
      paymentMethod: "shopify",
    });
    toast({
      title: "Payment Successful",
      description: "Your order has been placed successfully!",
    });
    forgetSavedStep();
    setLocation(`/thank-you/${orderId}`);
  };

  const handlePaymentError = (error: any) => {
    toast({
      title: "Payment Failed",
      description: "There was an error processing your payment. Please try again.",
      variant: "destructive",
    });
  };

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStep(2);
    const fullName = `${firstName} ${lastName}`.trim();
    fetch("/api/cart/email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, customerName: fullName, phone }),
    }).catch(() => {});
  };

  if (cartItems.length === 0 && !isLoading && !shopifyInProgress) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <SEO title="Checkout" description="Complete your purchase — instant digital download." />
        <Header cartCount={0} />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Your cart is empty</h1>
            <p className="text-muted-foreground mb-6">Add some products before checkout</p>
            <Link href="/shop">
              <Button>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Continue Shopping
              </Button>
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SEO 
        title="Secure Checkout" 
        description={`Complete your order of ${cartCount} item${cartCount !== 1 ? 's' : ''} for $${subtotal.toFixed(2)}. Secure payment and instant digital delivery.`}
      />
      <Header cartCount={cartCount} />

      <main className="flex-1">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Link href="/cart">
            <Button variant="ghost" className="mb-6" data-testid="button-back-cart">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Cart
            </Button>
          </Link>

          <div className="flex items-center justify-center mb-8">
            <div className="flex items-center gap-4">
              <div className={`flex items-center gap-2 ${step >= 1 ? 'text-primary' : 'text-muted-foreground'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${step >= 1 ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                  {step > 1 ? <CheckCircle className="w-5 h-5" /> : '1'}
                </div>
                <span className="font-medium hidden sm:inline">Contact Info</span>
              </div>
              <div className="w-16 h-px bg-border" />
              <div className={`flex items-center gap-2 ${step >= 2 ? 'text-primary' : 'text-muted-foreground'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${step >= 2 ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                  2
                </div>
                <span className="font-medium hidden sm:inline">Payment</span>
              </div>
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {step === 1 ? (
                      <>
                        <CreditCard className="w-5 h-5" />
                        Contact Information
                      </>
                    ) : (
                      <>
                        <Lock className="w-5 h-5" />
                        Secure Payment
                      </>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {step === 1 ? (
                    <form onSubmit={handleContactSubmit}>
                      <div className="space-y-4">
                        <div className="grid sm:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="firstName">First Name</Label>
                            <Input id="firstName" placeholder="John" required autoComplete="given-name" value={firstName} onChange={(e) => setFirstName(e.target.value)} data-testid="input-firstname" />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="lastName">Last Name</Label>
                            <Input id="lastName" placeholder="Doe" required autoComplete="family-name" value={lastName} onChange={(e) => setLastName(e.target.value)} data-testid="input-lastname" />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="email">Email Address</Label>
                          <Input id="email" type="email" placeholder="john@example.com" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} data-testid="input-email" />
                          <p className="text-xs text-muted-foreground">Your digital download link will be sent here</p>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="phone">Phone Number (Optional)</Label>
                          <Input id="phone" type="tel" placeholder="+1 (555) 000-0000" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} data-testid="input-phone" />
                        </div>

                        <Button type="submit" className="w-full" size="lg" data-testid="button-continue">
                          Continue to Payment
                        </Button>
                      </div>
                    </form>
                  ) : (
                    <div className="space-y-6">
                      <div className="p-4 bg-muted rounded-md">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div>
                            <p className="text-sm text-muted-foreground">Contact</p>
                            <p className="font-medium">{firstName} {lastName}</p>
                            <p className="text-sm text-muted-foreground">{email}</p>
                          </div>
                          <Button variant="ghost" size="sm" onClick={() => setStep(1)} disabled={shopifyInProgress} data-testid="button-edit-contact">
                            Edit
                          </Button>
                        </div>
                      </div>

                      {availableMethods.length > 1 && (
                        <div className="space-y-3" hidden={shopifyInProgress}>
                          <p className="text-sm font-medium text-muted-foreground">Choose payment method</p>
                          <div className={`grid gap-3 ${availableMethods.length >= 3 ? "grid-cols-1 sm:grid-cols-3" : "grid-cols-2"}`}>
                            {PAYMENT_TILES.filter((tile) => availableMethods.includes(tile.id)).map((tile) => (
                              <button
                                key={tile.id}
                                type="button"
                                onClick={() => setPaymentMethod(tile.id)}
                                className={`flex items-center justify-center gap-2 p-3 rounded-md border-2 transition-colors ${
                                  activeMethod === tile.id
                                    ? "border-primary bg-primary/5"
                                    : "border-border hover:border-muted-foreground/50"
                                }`}
                                data-testid={`button-select-${tile.id}`}
                              >
                                {tile.icon}
                                <span className="font-medium text-sm">{tile.label}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {!paymentMethods ? (
                        <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground" data-testid="payment-methods-loading">
                          <Loader2 className="w-5 h-5 animate-spin" />
                          <span className="text-sm">Loading payment options…</span>
                        </div>
                      ) : availableMethods.length === 0 ? (
                        <div className="p-4 rounded-md border border-destructive/40 bg-destructive/5" data-testid="text-no-payment-methods">
                          <p className="text-sm font-medium text-destructive">No payment method is available right now.</p>
                          <p className="text-sm text-muted-foreground mt-1">
                            Please contact us and we will complete your order manually.
                          </p>
                        </div>
                      ) : activeMethod === "shopify" ? (
                        <div data-testid="shopify-checkout-container">
                          <ShopifyCheckout
                            amount={subtotal.toFixed(2)}
                            customerEmail={email}
                            customerName={`${firstName} ${lastName}`.trim()}
                            phone={phone}
                            onPaymentSuccess={handleShopifySuccess}
                            onPaymentError={handlePaymentError}
                            onCheckoutStarted={() => setShopifyInProgress(true)}
                          />
                        </div>
                      ) : activeMethod === "stripe" ? (
                        <div data-testid="stripe-checkout-container">
                          <StripeCheckout
                            amount={subtotal.toFixed(2)}
                            customerEmail={email}
                            customerName={`${firstName} ${lastName}`.trim()}
                            phone={phone}
                            onPaymentSuccess={handleStripeSuccess}
                            onPaymentError={handlePaymentError}
                            onServerAmount={setServerAmount}
                          />
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <p className="text-sm text-muted-foreground text-center">
                            Pay ${subtotal.toFixed(2)} with your PayPal account, or choose
                            <span className="font-medium text-foreground"> Debit or Credit Card</span> — no PayPal
                            account needed. Card payments are processed securely by PayPal.
                          </p>
                          <div className="flex justify-center" data-testid="paypal-button-container">
                            <div className="w-full max-w-sm">
                              <PayPalButton
                                amount={subtotal.toFixed(2)}
                                currency="USD"
                                intent="CAPTURE"
                                customerEmail={email}
                                customerName={`${firstName} ${lastName}`.trim()}
                                phone={phone}
                                onPaymentSuccess={handlePayPalSuccess}
                                onPaymentError={handlePaymentError}
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="pt-4">
                        <Button type="button" variant="outline" className="w-full" onClick={() => setStep(1)} disabled={shopifyInProgress} data-testid="button-back-step">
                          Back to Contact Info
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="flex items-center justify-center gap-6 mt-6 text-sm text-muted-foreground flex-wrap">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-primary" />
                  <span>SSL Encrypted</span>
                </div>
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-primary" />
                  <span>Secure Payment</span>
                </div>
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-primary" />
                  <span>Instant Digital Delivery</span>
                </div>
              </div>
            </div>

            <div className="lg:col-span-1">
              <Card className="sticky top-24">
                <CardContent className="p-6">
                  <h2 className="font-semibold text-lg mb-4">Order Summary</h2>
                  
                  <div className="space-y-4 max-h-64 overflow-y-auto mb-4">
                    {cartItems.map((item) => {
                      if (!item.product) return null;
                      const price = item.product.salePrice ? parseFloat(item.product.salePrice) : parseFloat(item.product.price);
                      
                      return (
                        <div key={item.id} className="flex gap-3">
                          <div className="w-12 h-12 bg-muted rounded-md overflow-hidden shrink-0">
                            {item.product.imageUrl && (
                              <img
                                src={item.product.imageUrl}
                                alt={item.product.title}
                                className="w-full h-full object-cover"
                              />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium line-clamp-1">{item.product.title}</p>
                            <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
                          </div>
                          <span className="text-sm font-medium shrink-0">
                            ${(price * item.quantity).toFixed(2)}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  <Separator className="my-4" />

                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span>${subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Delivery</span>
                      <span className="text-primary font-medium">Instant</span>
                    </div>
                  </div>

                  <Separator className="my-4" />

                  <div className="flex justify-between font-bold text-lg">
                    <span>Total</span>
                    <span className="text-primary" data-testid="text-checkout-total">${subtotal.toFixed(2)} USD</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 text-right">All prices in US Dollars (USD)</p>

                  <div className="mt-4 p-3 bg-muted rounded-md">
                    <div className="flex items-center gap-2 text-sm">
                      <Zap className="w-4 h-4 text-primary" />
                      <span className="font-medium">Instant Digital Download</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Your digital download link is provided immediately after payment and emailed to you.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
