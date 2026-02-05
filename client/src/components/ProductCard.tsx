import { Link } from "wouter";
import { ShoppingCart, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Product } from "@shared/schema";

interface ProductCardProps {
  product: Product;
  onAddToCart: (productId: string) => void;
  isAdding?: boolean;
}

export function ProductCard({ product, onAddToCart, isAdding }: ProductCardProps) {
  const price = parseFloat(product.price);
  const salePrice = product.salePrice ? parseFloat(product.salePrice) : null;
  const hasDiscount = salePrice && salePrice < price;

  const displayPrice = hasDiscount ? salePrice : price;

  return (
    <Card className="group overflow-visible hover-elevate flex flex-col h-full" data-testid={`card-product-${product.id}`}>
      <Link href={`/products/${product.slug}`} className="block">
        <div className="relative aspect-[4/3] overflow-hidden bg-muted rounded-t-md">
          {product.imageUrl ? (
            <img
              src={product.imageUrl}
              alt={product.title}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
              No Image
            </div>
          )}
          {hasDiscount && (
            <Badge className="absolute top-2 left-2 bg-destructive text-destructive-foreground">
              Sale
            </Badge>
          )}
        </div>
      </Link>
      <CardContent className="flex-1 p-4">
        <Link href={`/products/${product.slug}`}>
          <h3 className="font-medium text-sm leading-tight line-clamp-2 hover:text-primary transition-colors mb-2" data-testid={`text-title-${product.id}`}>
            {product.title}
          </h3>
        </Link>
        {product.description && (
          <p className="text-xs text-muted-foreground line-clamp-2 mb-2" data-testid={`text-description-${product.id}`}>
            {product.description}
          </p>
        )}
        {product.category && (
          <Badge variant="secondary" className="text-xs mb-2">
            {product.category}
          </Badge>
        )}
        <div className="flex items-center gap-2 mt-auto">
          <span className="text-lg font-bold text-primary" data-testid={`text-price-${product.id}`}>
            ${displayPrice.toFixed(2)}
          </span>
          {hasDiscount && (
            <span className="text-sm text-muted-foreground line-through">
              ${price.toFixed(2)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
          <Zap className="w-3 h-3" />
          <span>Instant Download</span>
        </div>
      </CardContent>
      <CardFooter className="p-4 pt-0">
        <Button
          className="w-full"
          onClick={() => onAddToCart(product.id)}
          disabled={isAdding}
          data-testid={`button-add-cart-${product.id}`}
        >
          <ShoppingCart className="w-4 h-4 mr-2" />
          {isAdding ? "Adding..." : "Add to Cart"}
        </Button>
      </CardFooter>
    </Card>
  );
}
