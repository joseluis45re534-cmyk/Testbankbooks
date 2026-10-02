import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Save, Loader2, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { DEFAULT_MULTIBUY_CONFIG, priceCart, ordinal, type MultibuyConfig } from "@shared/multibuy";
import AdminLayout from "./AdminLayout";

const EXAMPLE_PRICE = "25.00";

export default function AdminOffers() {
  const { toast } = useToast();
  const [enabled, setEnabled] = useState(false);
  // Inputs for ranks 2 and up, kept as text while the admin types.
  const [tiers, setTiers] = useState<string[]>(DEFAULT_MULTIBUY_CONFIG.tiers.slice(1).map(String));

  const { data, isLoading } = useQuery<MultibuyConfig>({ queryKey: ["/api/admin/promo"] });

  useEffect(() => {
    if (!data) return;
    setEnabled(data.enabled);
    setTiers(data.tiers.slice(1).map(String));
  }, [data]);

  const parsed = tiers.map((t) => (t.trim() === "" ? NaN : Number(t)));
  const valid = parsed.every((n) => Number.isInteger(n) && n >= 0 && n <= 100);

  // "6 × $25 = $85": what a full ladder of same-priced items costs.
  const exampleItems = [0, ...parsed].map((_, i) => ({
    id: String(i),
    quantity: 1,
    product: { id: String(i), title: "", price: EXAMPLE_PRICE, salePrice: null },
  }));
  const example = valid ? priceCart(exampleItems, { enabled: true, tiers: [0, ...parsed] }) : null;

  const saveMutation = useMutation({
    mutationFn: async () => apiRequest("POST", "/api/admin/promo", { enabled, tiers: [0, ...parsed] }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/promo"] });
      queryClient.invalidateQueries({ queryKey: ["/api/promo"] });
      toast({ title: enabled ? "Offer saved and live" : "Offer saved (switched off)" });
    },
    onError: () => {
      toast({ title: "Failed to save the offer", variant: "destructive" });
    },
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-offers-title">Offers</h1>
          <p className="text-muted-foreground">Discounts applied automatically in the cart. Customers need no code.</p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-primary/10">
                  <Tag className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <CardTitle>Multi-buy: buy more, save more</CardTitle>
                  <CardDescription>
                    After an item is added to the cart, a popup shows this offer.
                  </CardDescription>
                </div>
              </div>
              <Switch checked={enabled} onCheckedChange={setEnabled} disabled={isLoading} data-testid="switch-multibuy" />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <Skeleton className="h-40 w-full" />
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  Items in the cart are ranked by price. The highest-priced item is full price and each
                  next one gets the discount below, so the cheapest items get the biggest discounts.
                  Items past the last rank are full price.
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  <div className="space-y-1">
                    <label className="text-sm font-medium">1st item</label>
                    <div className="h-9 flex items-center text-sm text-muted-foreground">Full price</div>
                  </div>
                  {tiers.map((t, i) => (
                    <div className="space-y-1" key={i}>
                      <label className="text-sm font-medium" htmlFor={`tier-${i + 2}`}>{ordinal(i + 2)} item</label>
                      <div className="relative">
                        <Input
                          id={`tier-${i + 2}`}
                          type="number"
                          inputMode="numeric"
                          min={0}
                          max={100}
                          step={1}
                          value={t}
                          onChange={(e) => setTiers(tiers.map((v, j) => (j === i ? e.target.value : v)))}
                          className="pr-8"
                          data-testid={`input-tier-${i + 2}`}
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span>
                      </div>
                    </div>
                  ))}
                </div>

                <p className="text-xs text-muted-foreground">
                  100% makes that item free. Items after the {ordinal(tiers.length + 1)} are full price.
                </p>

                {!valid && (
                  <p className="text-sm text-destructive">Each discount must be a whole number from 0 to 100.</p>
                )}
                {example && (
                  <p className="text-sm" data-testid="text-multibuy-example">
                    Example: {exampleItems.length} items at ${EXAMPLE_PRICE} cost{" "}
                    <span className="font-semibold">${example.total.toFixed(2)}</span> instead of $
                    {example.subtotal.toFixed(2)} (customer saves ${example.discount.toFixed(2)}).
                  </p>
                )}

                <Button
                  onClick={() => saveMutation.mutate()}
                  disabled={!valid || saveMutation.isPending}
                  data-testid="button-save-multibuy"
                >
                  {saveMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  Save offer
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
