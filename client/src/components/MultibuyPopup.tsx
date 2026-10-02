import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { CheckCircle2, Tag, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useCartPricing, useMultibuyConfig, offerSteps, offerProgress } from "@/hooks/use-multibuy";
import { cn } from "@/lib/utils";
import type { CartItemWithProduct } from "@shared/schema";

// Returns false when the offer is off, so the caller shows its usual toast.
type ShowOffer = (productTitle?: string) => boolean;

const MultibuyPopupContext = createContext<ShowOffer>(() => false);

// Call after a successful add to cart: `if (!showOffer(title)) toast(...)`.
export function useMultibuyPopup(): ShowOffer {
  return useContext(MultibuyPopupContext);
}

export function MultibuyPopupProvider({ children }: { children: ReactNode }) {
  const promo = useMultibuyConfig();
  const [open, setOpen] = useState(false);
  const [addedTitle, setAddedTitle] = useState<string | undefined>();

  const showOffer = useCallback<ShowOffer>((productTitle) => {
    if (!promo.enabled) return false;
    setAddedTitle(productTitle);
    setOpen(true);
    return true;
  }, [promo.enabled]);

  return (
    <MultibuyPopupContext.Provider value={showOffer}>
      {children}
      <Dialog open={open} onOpenChange={setOpen}>
        {/* Above the chat widget, which sits at z-[9999]. */}
        <DialogContent
          className="z-[10001] max-w-md w-[calc(100%-2rem)] max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-lg p-5 sm:p-6"
          overlayClassName="z-[10000] bg-black/60"
          data-testid="dialog-multibuy"
        >
          {open && <OfferBody addedTitle={addedTitle} onClose={() => setOpen(false)} />}
        </DialogContent>
      </Dialog>
    </MultibuyPopupContext.Provider>
  );
}

function OfferBody({ addedTitle, onClose }: { addedTitle?: string; onClose: () => void }) {
  const [, setLocation] = useLocation();
  // The add just invalidated the cart, so this refetches with the new item.
  const { data: cartItems = [], isFetching } = useQuery<CartItemWithProduct[]>({ queryKey: ["/api/cart"] });
  const { promo, pricing } = useCartPricing(cartItems);
  const steps = offerSteps(promo);
  const count = pricing.itemCount;
  const progress = offerProgress(pricing);

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 pr-6">
        <CheckCircle2 className="w-6 h-6 text-primary shrink-0 mt-0.5" />
        <div className="min-w-0">
          <DialogTitle className="text-lg">Added to your cart</DialogTitle>
          {addedTitle && (
            <p className="text-sm text-muted-foreground line-clamp-2 mt-0.5">{addedTitle}</p>
          )}
        </div>
      </div>

      <div className="rounded-lg border border-primary/25 bg-primary/5 p-4 space-y-3">
        <div className="flex items-center gap-2 font-semibold">
          <Tag className="w-4 h-4 text-primary" />
          Buy more, save more
        </div>

        <ol className="grid grid-cols-3 sm:grid-cols-6 gap-2" aria-label="Multi-buy discounts">
          {steps.map((s) => {
            const reached = !isFetching && s.position <= count;
            const isNext = !isFetching && s.position === count + 1;
            return (
              <li
                key={s.position}
                className={cn(
                  "rounded-md border px-1 py-2 text-center leading-tight",
                  reached && "bg-primary text-primary-foreground border-primary",
                  isNext && "border-primary ring-2 ring-primary/30 bg-background",
                  !reached && !isNext && "bg-background text-muted-foreground",
                )}
                data-testid={`multibuy-step-${s.position}`}
              >
                <div className="text-[11px] uppercase tracking-wide opacity-80">{s.ordinal}</div>
                <div className="text-sm font-bold">{s.percent >= 100 ? "FREE" : s.position === 1 ? "Full" : `${s.percent}%`}</div>
              </li>
            );
          })}
        </ol>

        <DialogDescription asChild>
          <div className="text-sm text-foreground" data-testid="text-multibuy-progress">
            {isFetching ? <Skeleton className="h-4 w-3/4" /> : progress}
          </div>
        </DialogDescription>
        <p className="text-xs text-muted-foreground">
          Applied automatically, with no code needed. Discounts go to your lower-priced items, up to {steps.length} items.
        </p>
      </div>

      <div className="flex flex-col-reverse sm:flex-row gap-2">
        <Button variant="outline" className="flex-1" onClick={onClose} data-testid="button-multibuy-keep-shopping">
          Keep shopping
        </Button>
        <Button
          className="flex-1"
          onClick={() => { onClose(); setLocation("/cart"); }}
          data-testid="button-multibuy-view-cart"
        >
          View cart
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
