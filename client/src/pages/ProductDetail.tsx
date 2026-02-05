import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { ArrowLeft, ShoppingCart, Zap, Shield, CheckCircle, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { SEO } from "@/components/SEO";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Product, CartItem } from "@shared/schema";

export default function ProductDetail() {
  const [, params] = useRoute("/products/:slug");
  const { toast } = useToast();

  const { data: product, isLoading, error } = useQuery<Product>({
    queryKey: ["/api/products", params?.slug],
    queryFn: async () => {
      const res = await fetch(`/api/products/${params?.slug}`);
      if (!res.ok) throw new Error("Product not found");
      return res.json();
    },
    enabled: !!params?.slug,
  });

  const { data: cartItems = [] } = useQuery<CartItem[]>({
    queryKey: ["/api/cart"],
  });

  const addToCartMutation = useMutation({
    mutationFn: async () => {
      if (!product) return;
      return apiRequest("POST", "/api/cart", { productId: product.id, quantity: 1 });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cart"] });
      toast({
        title: "Added to cart",
        description: "Item has been added to your cart",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add item to cart",
        variant: "destructive",
      });
    },
  });

  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <SEO title="Loading..." />
        <Header cartCount={cartCount} />
        <main className="flex-1">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="grid md:grid-cols-2 gap-12">
              <Skeleton className="aspect-square rounded-lg" />
              <div className="space-y-4">
                <Skeleton className="h-8 w-3/4" />
                <Skeleton className="h-6 w-1/4" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <SEO title="Product Not Found" description="The product you're looking for doesn't exist." />
        <Header cartCount={cartCount} />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Product Not Found</h1>
            <p className="text-muted-foreground mb-6">The product you're looking for doesn't exist.</p>
            <Link href="/">
              <Button>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Products
              </Button>
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const price = parseFloat(product.price);
  const salePrice = product.salePrice ? parseFloat(product.salePrice) : null;
  const hasDiscount = salePrice && salePrice < price;
  const displayPrice = hasDiscount ? salePrice : price;

  const seoTitle = `${product.title} - Instant Download`;
  const seoDescription = `${product.title}. $${displayPrice.toFixed(2)} - Instant Access for Exam Prep. Complete test bank with all chapters included.`.substring(0, 160);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SEO 
        title={seoTitle}
        description={seoDescription}
        image={product.imageUrl || undefined}
        type="product"
        price={displayPrice.toFixed(2)}
        availability={product.availability || "in_stock"}
      />
      <Header cartCount={cartCount} />

      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Link href="/">
            <Button variant="ghost" className="mb-6" data-testid="button-back">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Products
            </Button>
          </Link>

          <div className="grid md:grid-cols-2 gap-12">
            <div className="relative aspect-square bg-muted rounded-lg overflow-hidden">
              {product.imageUrl ? (
                <img
                  src={product.imageUrl}
                  alt={product.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <BookOpen className="w-24 h-24 text-muted-foreground" />
                </div>
              )}
              {hasDiscount && (
                <Badge className="absolute top-4 left-4 bg-destructive text-destructive-foreground text-base px-4 py-2">
                  Sale
                </Badge>
              )}
            </div>

            <div className="space-y-6">
              {product.category && (
                <Badge variant="secondary" className="text-sm">
                  {product.category}
                </Badge>
              )}

              <h1 className="text-3xl font-bold" data-testid="text-product-title">
                {product.title}
              </h1>

              <div className="flex items-baseline gap-4">
                <span className="text-4xl font-bold text-primary" data-testid="text-product-price">
                  ${displayPrice.toFixed(2)}
                </span>
                {hasDiscount && (
                  <span className="text-xl text-muted-foreground line-through">
                    ${price.toFixed(2)}
                  </span>
                )}
              </div>

              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2 text-sm">
                  <Zap className="w-5 h-5 text-primary" />
                  <span>Instant Digital Download</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Shield className="w-5 h-5 text-primary" />
                  <span>Secure Payment</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="w-5 h-5 text-primary" />
                  <span>Quality Guaranteed</span>
                </div>
              </div>

              {product.description && (
                <div className="prose prose-sm max-w-none">
                  <h3 className="text-lg font-semibold mb-2">Description</h3>
                  <p className="text-muted-foreground" data-testid="text-product-description">
                    {product.description}
                  </p>
                </div>
              )}

              <div className="pt-4">
                <Button
                  size="lg"
                  className="w-full md:w-auto min-w-64"
                  onClick={() => addToCartMutation.mutate()}
                  disabled={addToCartMutation.isPending}
                  data-testid="button-add-to-cart"
                >
                  <ShoppingCart className="w-5 h-5 mr-2" />
                  {addToCartMutation.isPending ? "Adding to Cart..." : "Add to Cart"}
                </Button>
              </div>

              <div className="bg-card rounded-lg p-6 space-y-4">
                <h3 className="font-semibold">What's Included:</h3>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-primary" />
                    Complete test bank with all chapters
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-primary" />
                    Instant access after purchase
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-primary" />
                    PDF format - works on any device
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-primary" />
                    Lifetime access to your purchase
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
