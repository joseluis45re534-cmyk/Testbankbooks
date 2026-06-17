import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { BookOpen, Calendar, Tag, ChevronRight, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { SEO } from "@/components/SEO";
import type { BlogPost, CartItem } from "@shared/schema";

function formatDate(date: string | Date | null | undefined): string {
  if (!date) return "";
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function Blog() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: cartItems = [] } = useQuery<CartItem[]>({ queryKey: ["/api/cart"] });
  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  const { data: posts = [], isLoading } = useQuery<BlogPost[]>({
    queryKey: ["/api/blog", selectedCategory],
    queryFn: async () => {
      const url = selectedCategory
        ? `/api/blog?category=${encodeURIComponent(selectedCategory)}`
        : "/api/blog";
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch posts");
      return res.json();
    },
  });

  const { data: categories = [] } = useQuery<{ name: string; count: number }[]>({
    queryKey: ["/api/blog/categories"],
  });

  const filteredPosts = searchQuery.trim()
    ? posts.filter(
        (p) =>
          p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.excerpt?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : posts;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SEO
        title="Nursing Test Bank Study Guides & Exam Tips | NursTestBank Blog"
        description="Expert nursing exam prep guides, test bank tips, and study strategies. Browse by specialty: pharmacology, medical-surgical, fundamentals, pediatrics, and more."
      />
      <Header cartCount={cartCount} />

      <main className="flex-1">
        <section className="bg-gradient-to-br from-primary/5 via-background to-primary/10 py-12 md:py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <p className="text-sm font-medium text-primary mb-3">Study Resources</p>
            <h1 className="text-3xl md:text-4xl font-bold mb-4">
              Nursing Exam Prep Blog
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
              Expert study guides, exam tips, and strategies to help nursing students
              succeed in their examinations.
            </p>
            <div className="max-w-xl mx-auto relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search study guides..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-12"
                data-testid="input-blog-search"
              />
            </div>
          </div>
        </section>

        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-col lg:flex-row gap-8">
            <aside className="lg:w-64 shrink-0">
              <div className="sticky top-24">
                <h2 className="font-semibold mb-4 text-lg">Browse by Category</h2>
                <div className="flex flex-wrap lg:flex-col gap-2">
                  <Button
                    variant={selectedCategory === null ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedCategory(null)}
                    className="justify-start"
                    data-testid="button-category-all"
                  >
                    All Topics
                    <span className="ml-auto text-xs opacity-70">{posts.length}</span>
                  </Button>
                  {categories.map((cat) => (
                    <Button
                      key={cat.name}
                      variant={selectedCategory === cat.name ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedCategory(cat.name)}
                      className="justify-start"
                      data-testid={`button-category-${cat.name.toLowerCase().replace(/\s+/g, "-")}`}
                    >
                      {cat.name}
                      <span className="ml-auto text-xs opacity-70">{cat.count}</span>
                    </Button>
                  ))}
                </div>
              </div>
            </aside>

            <div className="flex-1">
              {isLoading ? (
                <div className="grid sm:grid-cols-2 gap-6">
                  {[1, 2, 3, 4].map((i) => (
                    <Card key={i}>
                      <Skeleton className="aspect-video" />
                      <CardContent className="p-4 space-y-3">
                        <Skeleton className="h-4 w-1/3" />
                        <Skeleton className="h-6 w-full" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-3/4" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : filteredPosts.length === 0 ? (
                <div className="text-center py-16">
                  <BookOpen className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                  <h2 className="text-xl font-semibold mb-2">No articles found</h2>
                  <p className="text-muted-foreground mb-4">
                    {searchQuery
                      ? `No results for "${searchQuery}"`
                      : "No blog posts in this category yet."}
                  </p>
                  <Button onClick={() => { setSelectedCategory(null); setSearchQuery(""); }}>
                    View All Articles
                  </Button>
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 gap-6">
                  {filteredPosts.map((post) => (
                    <Link key={post.id} href={`/blog/${post.slug}`}>
                      <Card
                        className="hover-elevate cursor-pointer h-full overflow-hidden group"
                        data-testid={`card-blog-${post.id}`}
                      >
                        {post.imageUrl && (
                          <div className="aspect-video overflow-hidden bg-muted">
                            <img
                              src={post.imageUrl}
                              alt={post.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          </div>
                        )}
                        {!post.imageUrl && (
                          <div className="aspect-video bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
                            <BookOpen className="w-12 h-12 text-primary/40" />
                          </div>
                        )}
                        <CardContent className="p-4 md:p-5">
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            {post.category && (
                              <Badge variant="secondary" className="text-xs">
                                <Tag className="w-3 h-3 mr-1" />
                                {post.category}
                              </Badge>
                            )}
                            {post.createdAt && (
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {formatDate(post.createdAt)}
                              </span>
                            )}
                          </div>
                          <h2 className="font-semibold text-sm md:text-base mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                            {post.title}
                          </h2>
                          {post.excerpt && (
                            <p className="text-xs md:text-sm text-muted-foreground line-clamp-3 mb-3">
                              {post.excerpt}
                            </p>
                          )}
                          <span className="text-primary text-sm font-medium flex items-center gap-1">
                            Read Guide <ChevronRight className="w-4 h-4" />
                          </span>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="py-12 bg-primary text-primary-foreground">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-2xl font-bold mb-3">Ready to Start Practicing?</h2>
            <p className="opacity-90 mb-6">
              Browse our full collection of nursing test banks and get hundreds of exam-style questions in print, with a free digital copy.
            </p>
            <Link href="/shop">
              <Button variant="secondary" size="lg" data-testid="button-blog-cta">
                Browse Test Banks
              </Button>
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
