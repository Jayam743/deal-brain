import { getWishlistWithVerdicts, priceHistories } from "@coupon-app/shared";
import { DemoModeHint } from "@/components/demo-mode-hint";
import { PageHeader } from "@/components/page-header";
import { WishlistExplorer } from "@/components/wishlist-explorer";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export default function WishlistPage() {
  const wishlist = getWishlistWithVerdicts();
  const historyByProduct = Object.fromEntries(
    Object.entries(priceHistories).map(([productId, history]) => [
      productId,
      history.map((observation) => observation.price),
    ]),
  );

  return (
    <div>
      <PageHeader
        title="Wishlist"
        description="Tracked by identifier — UPC, ASIN, or store SKU. Threshold alerts fire once on a downward crossing, not on every check."
      />
      {!isSupabaseConfigured() ? <DemoModeHint className="-mt-4 mb-6" /> : null}

      <WishlistExplorer items={wishlist} historyByProduct={historyByProduct} />
    </div>
  );
}
