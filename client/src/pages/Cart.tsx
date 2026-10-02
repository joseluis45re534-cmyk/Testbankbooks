import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Trash2, ShoppingBag, ArrowRight, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { SEO } from "@/components/SEO";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { analytics } from "@/lib/analytics";
import { useCartPricing, offerProgress } from "@/hooks/use-multibuy";
import { offerLabel } from "@shared/multibuy";
import type { CartItemWithProduct } from "@shared/schema";

export default function Cart() {
  const { toast } = useToast();

  const { data: cartItems = [], isLoading } = useQuery<CartItemWithProduct[]>({
    queryKey: ["/api/cart"],
  });

  const removeItemMutation = useMutation({
    mutationFn: async (itemId: string) => {
      return apiRequest("DELETE", `/api/cart/${itemId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cart"] });
      toast({
        title: "Removed",
        description: "Item removed from cart",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to remove item",
        variant: "destructive",
      });
    },
  });

  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const { promo, pricing, lineFor } = useCartPricing(cartItems);
  const { subtotal, discount, total } = pricing;
  const progress = promo.enabled ? offerProgress(pricing) : null;

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <SEO title="Shopping Cart" description="Review your cart items before checkout." />
        <Header cartCount={0} />
        <main className="flex-1">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <h1 className="text-2xl font-bold mb-8">Shopping Cart</h1>
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <div className="flex gap-4">
                      <Skeleton className="w-24 h-24 rounded-md" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-5 w-3/4" />
                        <Skeleton className="h-4 w-1/4" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SEO 
        title="Shopping Cart" 
        description={cartItems.length > 0 
          ? `You have ${cartCount} item${cartCount !== 1 ? 's' : ''} in your cart. Total: $${total.toFixed(2)}`
          : "Your cart is empty. Browse our collection of test banks and study guides."
        } 
      />
      <Header cartCount={cartCount} />

      <main className="flex-1">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-2xl font-bold mb-8" data-testid="text-cart-title">Shopping Cart</h1>

          {cartItems.length === 0 ? (
            <div className="text-center py-16" data-testid="empty-cart">
              <ShoppingBag className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-xl font-semibold mb-2">Your cart is empty</h2>
              <p className="text-muted-foreground mb-6">Add some products to get started</p>
              <Link href="/shop">
                <Button data-testid="button-continue-shopping">
                  Continue Shopping
                </Button>
              </Link>
            </div>
          ) : (
            <div className="grid lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-4">
                {progress && (
                  <div
                    className="flex items-start gap-3 rounded-lg border border-primary/25 bg-primary/5 p-4 text-sm"
                    data-testid="banner-multibuy"
                  >
                    <Tag className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold">Buy more, save more. </span>
                      {progress}{" "}
                      {pricing.nextTier && (
                        <Link href="/shop" className="text-primary font-medium hover:underline">
                          Browse test banks
                        </Link>
                      )}
                    </div>
                  </div>
                )}
                {cartItems.map((item) => {
                  if (!item.product) return null;
                  const line = lineFor(item.id);
                  const price = line?.unitPrice ?? 0;
                  const paid = line ? line.unitPrice - line.discount : price;
                  
                  return (
                    <Card key={item.id} data-testid={`card-cart-item-${item.id}`}>
                      <CardContent className="p-4">
                        <div className="flex gap-4">
                          <Link href={`/products/${item.product.slug}`}>
                            <div className="w-24 h-24 bg-muted rounded-md overflow-hidden shrink-0">
                              {item.product.imageUrl ? (
                                <img
                                  src={item.product.imageUrl}
                                  alt={item.product.title}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                                  No Image
                                </div>
                              )}
                            </div>
                          </Link>

                          <div className="flex-1 min-w-0">
                            <Link href={`/products/${item.product.slug}`}>
                              <h3 className="font-medium line-clamp-2 hover:text-primary transition-colors">
                                {item.product.title}
                              </h3>
                            </Link>
                            <div className="flex items-center flex-wrap gap-2 mt-1">
                              <span className="text-lg font-bold text-primary">${paid.toFixed(2)}</span>
                              {line && line.discount > 0 && (
                                <>
                                  <span className="text-sm text-muted-foreground line-through">${price.toFixed(2)}</span>
                                  <Badge variant="secondary" data-testid={`badge-multibuy-${item.id}`}>
                                    {offerLabel(line.percentOff)}
                                  </Badge>
                                </>
                              )}
                            </div>

                            <div className="flex items-center justify-end mt-3">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive"
                                onClick={() => removeItemMutation.mutate(item.id)}
                                disabled={removeItemMutation.isPending}
                                data-testid={`button-remove-${item.id}`}
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Remove
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              <div className="lg:col-span-1">
                <Card className="sticky top-24">
                  <CardContent className="p-6">
                    <h2 className="font-semibold text-lg mb-4">Order Summary</h2>
                    
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Subtotal ({cartCount} items)</span>
                        <span>${subtotal.toFixed(2)}</span>
                      </div>
                      {discount > 0 && (
                        <div className="flex justify-between text-sm" data-testid="row-multibuy-discount">
                          <span className="text-muted-foreground">Multi-buy discount</span>
                          <span className="text-primary font-medium">−${discount.toFixed(2)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Delivery</span>
                        <span className="text-primary font-medium">Free (Instant)</span>
                      </div>
                    </div>

                    <Separator className="my-4" />

                    <div className="flex justify-between font-bold text-lg mb-6">
                      <span>Total</span>
                      <span className="text-primary" data-testid="text-cart-total">${total.toFixed(2)}</span>
                    </div>

                    <Link href="/checkout">
                      <Button
                        className="w-full"
                        size="lg"
                        data-testid="button-checkout"
                        onClick={() => {
                          analytics.beginCheckout(
                            cartItems
                              .filter((i) => !!i.product)
                              .map((i) => ({ product: i.product!, quantity: i.quantity })),
                            total
                          );
                        }}
                      >
                        Proceed to Checkout
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </Link>

                    <Link href="/shop">
                      <Button variant="ghost" className="w-full mt-2">
                        Continue Shopping
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
