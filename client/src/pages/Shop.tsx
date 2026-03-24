import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useSearch } from "wouter";
import { ProductGrid } from "@/components/ProductGrid";
import { CategorySidebar } from "@/components/CategorySidebar";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Filter } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Product, CartItem } from "@shared/schema";

export default function Shop() {
  const searchParams = useSearch();
  const params = new URLSearchParams(searchParams);
  const urlSearch = params.get("search") || "";
  const urlCategory = params.get("category") || null;
  
  const [searchQuery, setSearchQuery] = useState(urlSearch);
  const [activeSearch, setActiveSearch] = useState(urlSearch);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(urlCategory);
  const [addingProductId, setAddingProductId] = useState<string | undefined>();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  useEffect(() => {
    setSearchQuery(urlSearch);
    setActiveSearch(urlSearch);
  }, [urlSearch]);

  useEffect(() => {
    setSelectedCategory(urlCategory);
  }, [urlCategory]);

  // Use server-injected initial product data (set by Express SSR route)
  // so Googlebot and first-paint see real products immediately.
  const serverProducts: Product[] | undefined =
    !activeSearch && !selectedCategory
      ? (typeof window !== "undefined" ? (window as any).__SHOP_PRODUCTS__ : undefined)
      : undefined;

  const { data: products = [], isLoading } = useQuery<Product[]>({
    queryKey: ["/api/products", activeSearch, selectedCategory],
    initialData: serverProducts,
    queryFn: async () => {
      const params = new URLSearchParams();
      if (activeSearch) params.set("search", activeSearch);
      if (selectedCategory) params.set("category", selectedCategory);
      const res = await fetch(`/api/products?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch products");
      return res.json();
    },
  });

  const { data: cartItems = [] } = useQuery<CartItem[]>({
    queryKey: ["/api/cart"],
  });

  const addToCartMutation = useMutation({
    mutationFn: async (productId: string) => {
      setAddingProductId(productId);
      return apiRequest("POST", "/api/cart", { productId, quantity: 1 });
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
    onSettled: () => {
      setAddingProductId(undefined);
    },
  });

  const categories = useMemo(() => {
    const categoryMap = new Map<string, number>();
    products.forEach((product) => {
      const cat = product.category || "Uncategorized";
      categoryMap.set(cat, (categoryMap.get(cat) || 0) + 1);
    });
    return Array.from(categoryMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [products]);

  const handleSearch = () => {
    setActiveSearch(searchQuery);
    if (searchQuery.trim()) {
      setLocation(`/shop?search=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      setLocation("/shop");
    }
  };

  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  const pageTitle = selectedCategory 
    ? `${selectedCategory} Test Banks & Study Guides | Testbankbooks`
    : activeSearch 
      ? `Search: ${activeSearch} - Nursing Test Banks | Testbankbooks`
      : "Browse 300+ Nursing Test Banks & Study Guides | Testbankbooks";
  
  const pageDescription = selectedCategory
    ? `Browse our collection of ${selectedCategory.toLowerCase()} test banks and study guides. Expertly crafted exam prep materials with instant digital download after purchase.`
    : activeSearch
      ? `Search results for "${activeSearch}". Find nursing test banks and study materials for your exam preparation. Instant digital download.`
      : "Shop 300+ premium nursing test banks and study guides. Real exam-style questions with detailed answer explanations. Instant digital download after purchase — no waiting, no shipping.";

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SEO title={pageTitle} description={pageDescription} />
      <Header
        cartCount={cartCount}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold" data-testid="text-page-title">
                {selectedCategory
                  ? `${selectedCategory} Test Banks`
                  : activeSearch
                  ? `Results for "${activeSearch}"`
                  : "Nursing Test Banks & Study Guides"}
              </h1>
              <p className="text-muted-foreground mt-1">
                {isLoading && products.length === 0
                  ? "300+ products available"
                  : `${products.length} ${products.length === 1 ? "product" : "products"} available`}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Sheet>
                <SheetTrigger asChild className="lg:hidden">
                  <Button variant="outline" size="sm" data-testid="button-filter-mobile">
                    <Filter className="w-4 h-4 mr-2" />
                    Filter
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-80">
                  <div className="pt-8">
                    <CategorySidebar
                      categories={categories}
                      selectedCategory={selectedCategory}
                      onCategorySelect={setSelectedCategory}
                    />
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>

          <div className="flex gap-8">
            <aside className="hidden lg:block w-64 shrink-0">
              <CategorySidebar
                categories={categories}
                selectedCategory={selectedCategory}
                onCategorySelect={setSelectedCategory}
              />
            </aside>

            <div className="flex-1 min-w-0">
              <ProductGrid
                products={products}
                isLoading={isLoading}
                onAddToCart={(productId) => addToCartMutation.mutate(productId)}
                addingProductId={addingProductId}
              />
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
