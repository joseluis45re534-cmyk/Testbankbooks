import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { ArrowLeft, Shield, Zap, CheckCircle, CreditCard, Lock, Loader2 } from "lucide-react";
import { SiVisa, SiMastercard, SiPaypal } from "react-icons/si";
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
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { CartItemWithProduct } from "@shared/schema";

export default function Checkout() {
  const [step, setStep] = useState(1);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [email, setEmail] = useState("");

  const { data: cartItems = [], isLoading } = useQuery<CartItemWithProduct[]>({
    queryKey: ["/api/cart"],
  });

  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = cartItems.reduce((sum, item) => {
    const price = item.product?.salePrice ? parseFloat(item.product.salePrice) : parseFloat(item.product?.price || "0");
    return sum + price * item.quantity;
  }, 0);

  const placeOrderMutation = useMutation({
    mutationFn: async () => {
      const productIds = cartItems.map(item => item.productId);
      const productTitles = cartItems.map(item => item.product?.title || "");
      
      return apiRequest("POST", "/api/orders", {
        customerEmail: email,
        amount: subtotal.toFixed(2),
        status: "paid",
        paymentMethod: "card",
        productIds,
        productTitles,
      });
    },
    onSuccess: async (response) => {
      const order = await response.json();
      await apiRequest("DELETE", "/api/cart");
      queryClient.invalidateQueries({ queryKey: ["/api/cart"] });
      setLocation(`/thank-you/${order.id}`);
    },
    onError: () => {
      toast({
        title: "Order Failed",
        description: "There was an error processing your order. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (step === 1) {
      const emailInput = document.getElementById("email") as HTMLInputElement;
      setEmail(emailInput?.value || "");
      setStep(2);
    } else {
      placeOrderMutation.mutate();
    }
  };

  if (cartItems.length === 0 && !isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <SEO title="Checkout" description="Complete your purchase for instant access to test banks and study guides." />
        <Header cartCount={0} />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Your cart is empty</h1>
            <p className="text-muted-foreground mb-6">Add some products before checkout</p>
            <Link href="/">
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
        description={`Complete your order of ${cartCount} item${cartCount !== 1 ? 's' : ''} for $${subtotal.toFixed(2)}. Secure payment with instant digital download.`} 
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
                  <form onSubmit={handleSubmit}>
                    {step === 1 ? (
                      <div className="space-y-4">
                        <div className="grid sm:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="firstName">First Name</Label>
                            <Input id="firstName" placeholder="John" required data-testid="input-firstname" />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="lastName">Last Name</Label>
                            <Input id="lastName" placeholder="Doe" required data-testid="input-lastname" />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="email">Email Address</Label>
                          <Input id="email" type="email" placeholder="john@example.com" required data-testid="input-email" />
                          <p className="text-xs text-muted-foreground">Download links will be sent to this email</p>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="phone">Phone Number (Optional)</Label>
                          <Input id="phone" type="tel" placeholder="+1 (555) 000-0000" data-testid="input-phone" />
                        </div>
                        <Button type="submit" className="w-full" size="lg" data-testid="button-continue">
                          Continue to Payment
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-12 h-8 bg-background rounded border flex items-center justify-center">
                            <SiVisa className="w-8 h-5 text-[#1434CB]" />
                          </div>
                          <div className="w-12 h-8 bg-background rounded border flex items-center justify-center">
                            <SiMastercard className="w-8 h-5 text-[#EB001B]" />
                          </div>
                          <div className="w-12 h-8 bg-background rounded border flex items-center justify-center">
                            <SiPaypal className="w-8 h-5 text-[#00457C]" />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="cardNumber">Card Number</Label>
                          <Input id="cardNumber" placeholder="1234 5678 9012 3456" required data-testid="input-card-number" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="expiry">Expiry Date</Label>
                            <Input id="expiry" placeholder="MM/YY" required data-testid="input-expiry" />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="cvv">CVV</Label>
                            <Input id="cvv" placeholder="123" required data-testid="input-cvv" />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="cardName">Name on Card</Label>
                          <Input id="cardName" placeholder="JOHN DOE" required data-testid="input-card-name" />
                        </div>

                        <div className="flex gap-4 pt-4">
                          <Button type="button" variant="outline" className="flex-1" onClick={() => setStep(1)}>
                            Back
                          </Button>
                          <Button 
                            type="submit" 
                            className="flex-1" 
                            size="lg" 
                            disabled={placeOrderMutation.isPending}
                            data-testid="button-place-order"
                          >
                            {placeOrderMutation.isPending ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Processing...
                              </>
                            ) : (
                              `Place Order - $${subtotal.toFixed(2)}`
                            )}
                          </Button>
                        </div>
                      </div>
                    )}
                  </form>
                </CardContent>
              </Card>

              <div className="flex items-center justify-center gap-6 mt-6 text-sm text-muted-foreground">
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
                  <span>Instant Delivery</span>
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
                      <span className="text-primary font-medium">Free (Instant)</span>
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
                      <span className="font-medium">Instant Access</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Download links will be sent immediately after payment
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
