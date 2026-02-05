import { useState } from "react";
import { Link, useLocation } from "wouter";
import { ShoppingCart, Search, Menu, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";

interface HeaderProps {
  cartCount: number;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
}

export function Header({ cartCount, searchQuery: externalSearchQuery, onSearchChange }: HeaderProps) {
  const [location, setLocation] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [internalSearchQuery, setInternalSearchQuery] = useState("");

  const searchQuery = externalSearchQuery ?? internalSearchQuery;
  const handleSearchChange = onSearchChange ?? setInternalSearchQuery;

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setLocation(`/?search=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      setLocation("/");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearchSubmit(e);
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-background border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <div className="w-10 h-10 bg-primary rounded-md flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="font-bold text-xl hidden sm:block" data-testid="text-logo">Testbankbooks</span>
          </Link>

          <form onSubmit={handleSearchSubmit} className="flex-1 max-w-2xl hidden md:flex">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search test banks, nursing guides, study materials..."
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                onKeyDown={handleKeyDown}
                className="pl-10 pr-4 w-full"
                data-testid="input-search"
              />
            </div>
            <Button type="submit" className="ml-2" data-testid="button-search">
              Search
            </Button>
          </form>

          <div className="flex items-center gap-2">
            <Link href="/cart">
              <Button variant="ghost" size="icon" className="relative" data-testid="button-cart">
                <ShoppingCart className="w-5 h-5" />
                {cartCount > 0 && (
                  <Badge 
                    className="absolute -top-1 -right-1 w-5 h-5 p-0 flex items-center justify-center text-xs"
                    data-testid="badge-cart-count"
                  >
                    {cartCount}
                  </Badge>
                )}
              </Button>
            </Link>

            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild className="md:hidden">
                <Button variant="ghost" size="icon" data-testid="button-mobile-menu">
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-80">
                <div className="flex flex-col gap-6 pt-8">
                  <form onSubmit={handleSearchSubmit}>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        type="search"
                        placeholder="Search products..."
                        value={searchQuery}
                        onChange={(e) => handleSearchChange(e.target.value)}
                        className="pl-10"
                        data-testid="input-mobile-search"
                      />
                    </div>
                  </form>
                  <nav className="flex flex-col gap-2">
                    <Button
                      variant="ghost"
                      className="justify-start"
                      onClick={() => {
                        setLocation("/");
                        setMobileMenuOpen(false);
                      }}
                      data-testid="link-mobile-home"
                    >
                      All Products
                    </Button>
                    <Button
                      variant="ghost"
                      className="justify-start"
                      onClick={() => {
                        setLocation("/cart");
                        setMobileMenuOpen(false);
                      }}
                      data-testid="link-mobile-cart"
                    >
                      <ShoppingCart className="w-4 h-4 mr-2" />
                      Cart ({cartCount})
                    </Button>
                  </nav>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}
