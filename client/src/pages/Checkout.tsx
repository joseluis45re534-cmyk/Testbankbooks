import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { ArrowLeft, Shield, Zap, CheckCircle, CreditCard, Lock } from "lucide-react";
import { SiPaypal } from "react-icons/si";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { SEO } from "@/components/SEO";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { queryClient } from "@/lib/queryClient";
import { analytics } from "@/lib/analytics";
import type { CartItemWithProduct } from "@shared/schema";
import PayPalButton from "@/components/PayPalButton";
import StripeCheckout from "@/components/StripeCheckout";

type PaymentMethod = "stripe" | "paypal";

export default function Checkout() {
  const [step, setStep] = useState(1);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [address1, setAddress1] = useState("");
  const [address2, setAddress2] = useState("");
  const [city, setCity] = useState("");
  const [stateRegion, setStateRegion] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [country, setCountry] = useState("United States");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("stripe");
  const [serverAmount, setServerAmount] = useState<string | null>(null);

  const shippingAddress = {
    address1,
    address2,
    city,
    state: stateRegion,
    postalCode,
    country,
  };

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

  if (cartItems.length === 0 && !isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <SEO title="Checkout" description="Complete your purchase — printed book shipped free, plus a free digital copy." />
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
        description={`Complete your order of ${cartCount} item${cartCount !== 1 ? 's' : ''} for $${subtotal.toFixed(2)}. Secure payment, free shipping, and a free digital copy.`}
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
                            <Input id="firstName" placeholder="John" required value={firstName} onChange={(e) => setFirstName(e.target.value)} data-testid="input-firstname" />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="lastName">Last Name</Label>
                            <Input id="lastName" placeholder="Doe" required value={lastName} onChange={(e) => setLastName(e.target.value)} data-testid="input-lastname" />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="email">Email Address</Label>
                          <Input id="email" type="email" placeholder="john@example.com" required value={email} onChange={(e) => setEmail(e.target.value)} data-testid="input-email" />
                          <p className="text-xs text-muted-foreground">Order updates &amp; your free digital copy are sent here</p>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="phone">Phone Number (Optional)</Label>
                          <Input id="phone" type="tel" placeholder="+1 (555) 000-0000" value={phone} onChange={(e) => setPhone(e.target.value)} data-testid="input-phone" />
                        </div>

                        <Separator className="my-2" />
                        <p className="text-sm font-medium">Shipping Address</p>
                        <p className="text-xs text-muted-foreground -mt-2">Where should we mail your printed book?</p>

                        <div className="space-y-2">
                          <Label htmlFor="address1">Street Address</Label>
                          <Input id="address1" placeholder="123 Main St" required value={address1} onChange={(e) => setAddress1(e.target.value)} data-testid="input-address1" />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="address2">Apartment, suite, etc. (Optional)</Label>
                          <Input id="address2" placeholder="Apt 4B" value={address2} onChange={(e) => setAddress2(e.target.value)} data-testid="input-address2" />
                        </div>
                        <div className="grid sm:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="city">City</Label>
                            <Input id="city" placeholder="New York" required value={city} onChange={(e) => setCity(e.target.value)} data-testid="input-city" />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="state">State / Province</Label>
                            <Input id="state" placeholder="NY" required value={stateRegion} onChange={(e) => setStateRegion(e.target.value)} data-testid="input-state" />
                          </div>
                        </div>
                        <div className="grid sm:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="postalCode">ZIP / Postal Code</Label>
                            <Input id="postalCode" placeholder="10001" required value={postalCode} onChange={(e) => setPostalCode(e.target.value)} data-testid="input-postal" />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="country">Country</Label>
                            <Input id="country" placeholder="United States" required value={country} onChange={(e) => setCountry(e.target.value)} data-testid="input-country" />
                          </div>
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
                          <Button variant="ghost" size="sm" onClick={() => setStep(1)} data-testid="button-edit-contact">
                            Edit
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <p className="text-sm font-medium text-muted-foreground">Choose payment method</p>
                        <div className="grid grid-cols-2 gap-3">
                          <button
                            type="button"
                            onClick={() => setPaymentMethod("stripe")}
                            className={`flex items-center justify-center gap-2 p-3 rounded-md border-2 transition-colors ${
                              paymentMethod === "stripe"
                                ? "border-primary bg-primary/5"
                                : "border-border hover:border-muted-foreground/50"
                            }`}
                            data-testid="button-select-stripe"
                          >
                            <CreditCard className="w-5 h-5" />
                            <span className="font-medium text-sm">Card / Wallet</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setPaymentMethod("paypal")}
                            className={`flex items-center justify-center gap-2 p-3 rounded-md border-2 transition-colors ${
                              paymentMethod === "paypal"
                                ? "border-primary bg-primary/5"
                                : "border-border hover:border-muted-foreground/50"
                            }`}
                            data-testid="button-select-paypal"
                          >
                            <SiPaypal className="w-5 h-5 text-[#00457C]" />
                            <span className="font-medium text-sm">PayPal</span>
                          </button>
                        </div>
                      </div>

                      {paymentMethod === "stripe" ? (
                        <div data-testid="stripe-checkout-container">
                          <StripeCheckout
                            amount={subtotal.toFixed(2)}
                            customerEmail={email}
                            customerName={`${firstName} ${lastName}`.trim()}
                            phone={phone}
                            shippingAddress={shippingAddress}
                            onPaymentSuccess={handleStripeSuccess}
                            onPaymentError={handlePaymentError}
                            onServerAmount={setServerAmount}
                          />
                        </div>
                      ) : (
                        <div className="text-center space-y-4">
                          <p className="text-sm text-muted-foreground">
                            Click the button below to securely pay ${subtotal.toFixed(2)} via PayPal
                          </p>
                          <div className="flex justify-center" data-testid="paypal-button-container">
                            <PayPalButton
                              amount={subtotal.toFixed(2)}
                              currency="USD"
                              intent="CAPTURE"
                              customerEmail={email}
                              customerName={`${firstName} ${lastName}`.trim()}
                              phone={phone}
                              shippingAddress={shippingAddress}
                              onPaymentSuccess={handlePayPalSuccess}
                              onPaymentError={handlePaymentError}
                            />
                          </div>
                        </div>
                      )}

                      <div className="pt-4">
                        <Button type="button" variant="outline" className="w-full" onClick={() => setStep(1)} data-testid="button-back-step">
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
                  <span>Free Shipping + Digital Copy</span>
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
                      <span className="text-muted-foreground">Shipping</span>
                      <span className="text-primary font-medium">Free</span>
                    </div>
                  </div>

                  <Separator className="my-4" />

                  <div className="flex justify-between font-bold text-lg">
                    <span>Total</span>
                    <span className="text-primary" data-testid="text-checkout-total">${subtotal.toFixed(2)}</span>
                  </div>

                  <div className="mt-4 p-3 bg-muted rounded-md">
                    <div className="flex items-center gap-2 text-sm">
                      <Zap className="w-4 h-4 text-primary" />
                      <span className="font-medium">Physical book + free digital copy</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Your printed book ships within 1–2 business days. A free digital copy is emailed instantly after payment.
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
