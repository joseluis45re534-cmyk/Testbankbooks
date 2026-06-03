import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "wouter";
import { ArrowLeft, Calendar, Tag, ShoppingCart, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { SEO } from "@/components/SEO";
import type { BlogPost as BlogPostType, CartItem, Product } from "@shared/schema";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

function formatDate(date: string | Date | null | undefined): string {
  if (!date) return "";
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function BlogPostSkeleton() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <Skeleton className="h-6 w-32" />
      <Skeleton className="h-64 w-full rounded-xl" />
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-10 w-3/4" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
      <div className="space-y-3 pt-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-4 w-full" />
        ))}
      </div>
    </div>
  );
}

export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>();
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: cartItems = [] } = useQuery<CartItem[]>({ queryKey: ["/api/cart"] });
  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  const { data: post, isLoading, isError } = useQuery<BlogPostType>({
    queryKey: ["/api/blog", slug],
    queryFn: async () => {
      const res = await fetch(`/api/blog/${slug}`);
      if (!res.ok) throw new Error("Not found");
      return res.json();
    },
    enabled: !!slug,
  });

  const { data: relatedProduct } = useQuery<Product>({
    queryKey: ["/api/products", post?.productId],
    queryFn: async () => {
      if (!post?.productId) throw new Error("No product");
      const res = await fetch(`/api/products/id/${post.productId}`);
      if (!res.ok) throw new Error("Not found");
      return res.json();
    },
    enabled: !!post?.productId,
  });

  const addToCartMutation = useMutation({
    mutationFn: (productId: string) =>
      apiRequest("POST", "/api/cart", { productId, quantity: 1 }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/cart"] });
      toast({ title: "Added to cart", description: "Item added successfully." });
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header cartCount={cartCount} />
        <main className="flex-1">
          <BlogPostSkeleton />
        </main>
        <Footer />
      </div>
    );
  }

  if (isError || !post) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header cartCount={cartCount} />
        <main className="flex-1 flex items-center justify-center py-24">
          <div className="text-center">
            <BookOpen className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h1 className="text-2xl font-bold mb-2">Article Not Found</h1>
            <p className="text-muted-foreground mb-6">This study guide doesn't exist or has been removed.</p>
            <Link href="/blog">
              <Button>Browse All Study Guides</Button>
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const salePrice = relatedProduct?.salePrice ? parseFloat(relatedProduct.salePrice) : null;
  const regularPrice = relatedProduct ? parseFloat(relatedProduct.price) : null;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SEO
        title={post.metaTitle || post.title}
        description={post.metaDescription || post.excerpt || ""}
        image={post.imageUrl || undefined}
        type="blog"
        category={post.category || undefined}
        publishedDate={post.createdAt ? new Date(String(post.createdAt)).toISOString().split("T")[0] : undefined}
      />
      <Header cartCount={cartCount} />

      <main className="flex-1">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Link href="/blog" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
            <ArrowLeft className="w-4 h-4" />
            Back to Study Guides
          </Link>

          <div className="lg:grid lg:grid-cols-3 lg:gap-10">
            <article className="lg:col-span-2">
              {post.imageUrl && (
                <div className="aspect-video overflow-hidden rounded-xl mb-6 bg-muted">
                  <img
                    src={post.imageUrl}
                    alt={post.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              <div className="flex items-center gap-3 mb-4 flex-wrap">
                {post.category && (
                  <Badge variant="secondary">
                    <Tag className="w-3 h-3 mr-1" />
                    {post.category}
                  </Badge>
                )}
                {post.createdAt && (
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {formatDate(post.createdAt)}
                  </span>
                )}
              </div>

              <h1 className="text-2xl md:text-3xl font-bold mb-4">{post.title}</h1>

              {post.excerpt && (
                <p className="text-lg text-muted-foreground mb-8 leading-relaxed border-l-4 border-primary pl-4">
                  {post.excerpt}
                </p>
              )}

              <div
                className="blog-content prose max-w-none"
                dangerouslySetInnerHTML={{ __html: post.content || "" }}
                data-testid="content-blog-post"
              />
            </article>

            <aside className="mt-10 lg:mt-0 space-y-6">
              {relatedProduct && (
                <Card className="border-2 border-primary/20 sticky top-24">
                  <CardContent className="p-5">
                    <p className="text-xs font-medium text-primary uppercase tracking-wide mb-3">Get Instant Access</p>
                    {relatedProduct.imageUrl && (
                      <img
                        src={relatedProduct.imageUrl}
                        alt={relatedProduct.title}
                        className="w-full aspect-video object-cover rounded-lg mb-3"
                      />
                    )}
                    <h3 className="font-semibold text-sm mb-2 line-clamp-2">{relatedProduct.title}</h3>
                    <div className="flex items-baseline gap-2 mb-4">
                      {salePrice ? (
                        <>
                          <span className="text-2xl font-bold text-primary">${salePrice.toFixed(2)}</span>
                          <span className="text-sm text-muted-foreground line-through">${regularPrice?.toFixed(2)}</span>
                        </>
                      ) : (
                        <span className="text-2xl font-bold text-primary">${regularPrice?.toFixed(2)}</span>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Button
                        className="w-full"
                        onClick={() => addToCartMutation.mutate(relatedProduct.id)}
                        disabled={addToCartMutation.isPending}
                        data-testid="button-add-to-cart-sidebar"
                      >
                        <ShoppingCart className="w-4 h-4 mr-2" />
                        Add to Cart
                      </Button>
                      <Link href={`/products/${relatedProduct.slug}`}>
                        <Button variant="outline" className="w-full" size="sm" data-testid="button-view-product-sidebar">
                          View Full Details
                        </Button>
                      </Link>
                    </div>
                    <ul className="mt-4 space-y-1.5 text-xs text-muted-foreground">
                      <li className="flex items-center gap-2">✅ Instant download after purchase</li>
                      <li className="flex items-center gap-2">✅ Hundreds of exam-style questions</li>
                      <li className="flex items-center gap-2">✅ Detailed answer rationales</li>
                      <li className="flex items-center gap-2">✅ 30-day money-back guarantee</li>
                    </ul>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardContent className="p-5">
                  <h3 className="font-semibold mb-3">Browse More Study Guides</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Find expert study guides for all nursing specialties and textbooks.
                  </p>
                  <Link href="/blog">
                    <Button variant="outline" className="w-full" size="sm">
                      View All Guides
                    </Button>
                  </Link>
                  <Link href="/shop">
                    <Button className="w-full mt-2" size="sm">
                      Browse Test Banks
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </aside>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
