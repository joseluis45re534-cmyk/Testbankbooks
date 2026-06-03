import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { ChevronRight } from "lucide-react";

interface CategorySidebarProps {
  categories: { name: string; count: number }[];
  selectedCategory: string | null;
  onCategorySelect: (category: string | null) => void;
}

export function CategorySidebar({ categories, selectedCategory, onCategorySelect }: CategorySidebarProps) {
  return (
    <div className="w-full">
      <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-4">
        Categories
      </h3>
      <ScrollArea className="h-[calc(100vh-16rem)]">
        <div className="space-y-1 pr-4">
          <Button
            variant={selectedCategory === null ? "secondary" : "ghost"}
            className="w-full justify-between h-auto py-2 px-3"
            onClick={() => onCategorySelect(null)}
            data-testid="button-category-all"
          >
            <span className="flex items-center gap-2">
              <ChevronRight className={`w-4 h-4 transition-transform ${selectedCategory === null ? 'rotate-90' : ''}`} />
              All Products
            </span>
            <Badge variant="outline" className="ml-auto">
              {categories.reduce((sum, cat) => sum + cat.count, 0)}
            </Badge>
          </Button>
          {categories.map((category) => (
            <Button
              key={category.name}
              variant={selectedCategory === category.name ? "secondary" : "ghost"}
              className="w-full justify-between h-auto py-2 px-3 text-left"
              onClick={() => onCategorySelect(category.name)}
              data-testid={`button-category-${category.name.toLowerCase().replace(/\s+/g, '-')}`}
            >
              <span className="flex items-center gap-2 truncate">
                <ChevronRight className={`w-4 h-4 transition-transform shrink-0 ${selectedCategory === category.name ? 'rotate-90' : ''}`} />
                <span className="truncate">{category.name}</span>
              </span>
              <Badge variant="outline" className="ml-2 shrink-0">
                {category.count}
              </Badge>
            </Button>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
