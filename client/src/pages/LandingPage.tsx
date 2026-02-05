import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Search, Download, Clock, Shield, CheckCircle, BookOpen, Zap, HeadphonesIcon, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { SEO } from "@/components/SEO";
import { useState } from "react";
import { useLocation } from "wouter";
import type { Product, CartItem } from "@shared/schema";

export default function LandingPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [, setLocation] = useLocation();

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const { data: cartItems = [] } = useQuery<CartItem[]>({
    queryKey: ["/api/cart"],
  });

  const { data: categories = [] } = useQuery<{ name: string; count: number }[]>({
    queryKey: ["/api/categories"],
  });

  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const latestProducts = products.slice(0, 8);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setLocation(`/shop?search=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      setLocation("/shop");
    }
  };

  const popularSearches = [
    "Fundamentals of Nursing",
    "Medical-Surgical Nursing",
    "Pharmacology",
    "Pediatric Nursing"
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SEO 
        title="Testbankbooks - Premium Test Banks & Study Guides for Nursing Students"
        description="Access 263+ test banks and study guides designed specifically for nursing and medical students. Practice with real exam-style questions and boost your scores. Instant download available."
      />
      <Header cartCount={cartCount} />

      <main className="flex-1">
        <section className="bg-gradient-to-br from-primary/5 via-background to-primary/10 py-16 md:py-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <p className="text-sm font-medium text-primary mb-4" data-testid="text-trust-badge">
              Trusted by 10,000+ Students
            </p>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight" data-testid="text-hero-title">
              Pass Your Nursing<br />Exams with Confidence
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
              Access 263+ test banks and study guides designed specifically for nursing and medical students. Practice with real exam-style questions and boost your scores.
            </p>

            <form onSubmit={handleSearch} className="max-w-2xl mx-auto mb-6">
              <div className="relative flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Search test banks, nursing guides, study materials..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-12 h-14 text-lg"
                    data-testid="input-hero-search"
                  />
                </div>
                <Button type="submit" size="lg" className="h-14 px-8" data-testid="button-hero-search">
                  Search
                </Button>
              </div>
            </form>

            <div className="flex flex-wrap justify-center gap-2 mb-10">
              <span className="text-sm text-muted-foreground">Popular:</span>
              {popularSearches.map((term) => (
                <Button
                  key={term}
                  variant="ghost"
                  size="sm"
                  className="text-primary hover:text-primary"
                  onClick={() => setLocation(`/shop?search=${encodeURIComponent(term)}`)}
                  data-testid={`button-popular-${term.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  {term}
                </Button>
              ))}
            </div>

            <div className="flex flex-wrap justify-center gap-4 md:gap-8">
              <Link href="/shop">
                <Button size="lg" className="h-12 px-8" data-testid="button-browse-products">
                  Browse All Products
                </Button>
              </Link>
            </div>
          </div>
        </section>

        <section className="py-8 border-y bg-card">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-wrap justify-center gap-8 md:gap-16">
              <div className="flex items-center gap-3">
                <Download className="w-6 h-6 text-primary" />
                <span className="font-medium">Instant Download</span>
              </div>
              <div className="flex items-center gap-3">
                <Clock className="w-6 h-6 text-primary" />
                <span className="font-medium">Lifetime Access</span>
              </div>
              <div className="flex items-center gap-3">
                <HeadphonesIcon className="w-6 h-6 text-primary" />
                <span className="font-medium">24/7 Support</span>
              </div>
            </div>
          </div>
        </section>

        <section className="py-12 md:py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
              <Card className="text-center">
                <CardContent className="pt-6">
                  <div className="w-12 h-12 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center">
                    <Zap className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-2">Instant Access</h3>
                  <p className="text-sm text-muted-foreground">Download immediately after purchase</p>
                </CardContent>
              </Card>
              <Card className="text-center">
                <CardContent className="pt-6">
                  <div className="w-12 h-12 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center">
                    <Shield className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-2">Secure Payment</h3>
                  <p className="text-sm text-muted-foreground">Protected by secure checkout</p>
                </CardContent>
              </Card>
              <Card className="text-center">
                <CardContent className="pt-6">
                  <div className="w-12 h-12 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-2">Exam-Ready</h3>
                  <p className="text-sm text-muted-foreground">Questions match real exam format</p>
                </CardContent>
              </Card>
              <Card className="text-center">
                <CardContent className="pt-6">
                  <div className="w-12 h-12 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center">
                    <BookOpen className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-2">Updated Content</h3>
                  <p className="text-sm text-muted-foreground">Latest editions available</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        <section className="py-12 md:py-16 bg-muted/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-8">
              <div>
                <p className="text-sm text-primary font-medium mb-1">Browse by Subject</p>
                <h2 className="text-2xl md:text-3xl font-bold">Shop by Category</h2>
                <p className="text-muted-foreground mt-1">Find test banks organized by textbook and subject area</p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {categories.slice(0, 8).map((category) => (
                <Link key={category.name} href={`/shop?category=${encodeURIComponent(category.name)}`}>
                  <Card className="hover-elevate cursor-pointer h-full">
                    <CardContent className="p-4 md:p-6">
                      <h3 className="font-semibold text-sm md:text-base mb-1">{category.name}</h3>
                      <p className="text-xs md:text-sm text-muted-foreground">{category.count} products</p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="py-12 md:py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-8">
              <div>
                <p className="text-sm text-primary font-medium mb-1">New Arrivals</p>
                <h2 className="text-2xl md:text-3xl font-bold">Latest Products</h2>
                <p className="text-muted-foreground mt-1">Recently added test banks and study guides</p>
              </div>
              <Link href="/shop">
                <Button variant="outline" data-testid="button-browse-all">Browse All</Button>
              </Link>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
              {latestProducts.map((product) => {
                const price = parseFloat(product.price);
                const salePrice = product.salePrice ? parseFloat(product.salePrice) : null;
                const hasDiscount = salePrice && salePrice < price;
                const discountPercent = hasDiscount ? Math.round((1 - salePrice / price) * 100) : 0;

                return (
                  <Link key={product.id} href={`/products/${product.slug}`}>
                    <Card className="hover-elevate cursor-pointer h-full overflow-hidden group">
                      <div className="relative aspect-square bg-muted">
                        {product.imageUrl ? (
                          <img
                            src={product.imageUrl}
                            alt={product.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <BookOpen className="w-12 h-12 text-muted-foreground" />
                          </div>
                        )}
                        {hasDiscount && (
                          <Badge className="absolute top-2 left-2 bg-destructive text-destructive-foreground">
                            -{discountPercent}%
                          </Badge>
                        )}
                        <Badge variant="secondary" className="absolute top-2 right-2">
                          Digital
                        </Badge>
                      </div>
                      <CardContent className="p-3 md:p-4">
                        {product.category && (
                          <p className="text-xs text-primary mb-1">{product.category}</p>
                        )}
                        <h3 className="font-medium text-sm line-clamp-2 mb-2 group-hover:text-primary transition-colors">
                          {product.title}
                        </h3>
                        <div className="flex items-center gap-1 mb-2">
                          <Star className="w-3 h-3 fill-primary text-primary" />
                          <span className="text-xs">4.9</span>
                          <span className="text-xs text-muted-foreground">(128)</span>
                        </div>
                        <div className="flex items-baseline gap-2">
                          <span className="font-bold text-primary">
                            ${(hasDiscount ? salePrice : price).toFixed(2)}
                          </span>
                          {hasDiscount && (
                            <span className="text-sm text-muted-foreground line-through">
                              ${price.toFixed(2)}
                            </span>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>

            <div className="text-center mt-8">
              <Link href="/shop">
                <Button size="lg" data-testid="button-view-all-products">
                  View All {products.length} Products
                </Button>
              </Link>
            </div>
          </div>
        </section>

        <section className="py-12 md:py-16 bg-muted/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-10">
              <p className="text-sm text-primary font-medium mb-1">Why Choose Us</p>
              <h2 className="text-2xl md:text-3xl font-bold">The Testbankbooks Advantage</h2>
              <p className="text-muted-foreground mt-2 max-w-2xl mx-auto">
                Everything you need to ace your nursing exams in one place
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6 md:gap-8">
              <Card>
                <CardContent className="p-6 text-center">
                  <div className="w-16 h-16 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">Premium Quality</h3>
                  <p className="text-muted-foreground">
                    Comprehensive question banks that match actual exam content and format
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6 text-center">
                  <div className="w-16 h-16 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center">
                    <Zap className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">Instant Delivery</h3>
                  <p className="text-muted-foreground">
                    Download your study materials immediately after purchase - no waiting
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6 text-center">
                  <div className="w-16 h-16 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center">
                    <Star className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">Student Trusted</h3>
                  <p className="text-muted-foreground">
                    Join thousands of nursing students who improved their exam scores
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        <section className="py-16 md:py-20 bg-primary text-primary-foreground">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-2xl md:text-3xl font-bold mb-4">Ready to Start Studying?</h2>
            <p className="text-lg opacity-90 mb-8">
              Get instant access to the test banks you need. Start practicing today and walk into your exam with confidence.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link href="/shop">
                <Button size="lg" variant="secondary" className="h-12 px-8" data-testid="button-cta-browse">
                  Browse Products
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
