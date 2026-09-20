import { NOW, coupons, dealFeedItems, getWishlistWithVerdicts, stores } from "@coupon-app/shared";
import Link from "next/link";
import { DashboardHero } from "@/components/dashboard-hero";
import { DealCard } from "@/components/deal-card";
import { StaggerIn } from "@/components/stagger-in";
import { StatCard } from "@/components/stat-card";
import { VerdictBadge } from "@/components/verdict-badge";
import { dealsPerDay, trackedGrowth, verdictSpread, verifiedGrowth } from "@/lib/trends";
import { formatMoney } from "@/lib/format";

export default function DashboardPage() {
  const wishlist = getWishlistWithVerdicts();
  const tracked = wishlist.length;
  const readyVerdicts = wishlist.filter((w) => w.verdict.status === "verdict").length;
  const verifiedCodes = coupons.filter((c) => c.verifiedStatus === "verified").length;
  const trackedStores = stores.filter((s) => s.role === "tracked").length;
  const storeBySlug = new Map(stores.map((s) => [s.slug, s]));
  const flagship = wishlist.find((item) => item.verdict.status === "verdict") ?? wishlist[0];
  const newDealsToday = dealFeedItems.filter(
    (deal) => NOW.getTime() - new Date(deal.postedAt).getTime() <= 24 * 60 * 60 * 1000,
  ).length;

  return (
    <div>
      <DashboardHero
        trackedCount={tracked}
        verifiedCount={verifiedCodes}
        trackedStores={trackedStores}
        flagship={flagship}
      />

      <StaggerIn className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4" y={10}>
        <StatCard
          label="Tracked items"
          value={tracked}
          hint={`across ${trackedStores} tracked stores`}
          trend={trackedGrowth(wishlist)}
        />
        <StatCard
          label="Verdicts ready"
          value={readyVerdicts}
          suffix={`/ ${tracked}`}
          hint={readyVerdicts < tracked ? "the rest are still accruing history" : "all caught up"}
          trend={verdictSpread(wishlist)}
        />
        <StatCard
          label="Verified codes"
          value={verifiedCodes}
          hint="quarantined codes are hidden by default"
          trend={verifiedGrowth(coupons)}
        />
        <StatCard
          label="New deals today"
          value={newDealsToday}
          hint="Woot · DealNews · Slickdeals"
          trend={dealsPerDay(dealFeedItems)}
        />
      </StaggerIn>

      <section className="mt-10">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-base font-semibold">Wishlist snapshot</h2>
          <Link href="/wishlist" className="text-sm text-[color:var(--color-accent)]">
            View all
          </Link>
        </div>
        <div className="surface-panel overflow-hidden">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b" style={{ borderColor: "var(--color-border)" }}>
                <th className="px-5 py-3 font-medium text-[color:var(--color-text-muted)]">
                  Item
                </th>
                <th className="px-5 py-3 font-medium text-[color:var(--color-text-muted)]">
                  Price
                </th>
                <th className="px-5 py-3 font-medium text-[color:var(--color-text-muted)]">
                  Verdict
                </th>
              </tr>
            </thead>
            <tbody>
              {wishlist.slice(0, 5).map((item, index) => (
                <tr
                  key={item.id}
                  className="border-b last:border-b-0"
                  style={{ borderColor: "var(--color-border)" }}
                >
                  <td className="px-5 py-3.5">
                    <div className="font-medium">{item.product.title}</div>
                    <div className="text-xs text-[color:var(--color-text-muted)]">
                      {item.product.brand}
                    </div>
                  </td>
                  <td className="tabular px-5 py-3.5 font-mono">
                    {formatMoney(item.currentPrice)}
                  </td>
                  <td className="px-5 py-3.5">
                    <VerdictBadge verdict={item.verdict} size={index === 0 ? "lg" : "sm"} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-10">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-base font-semibold">Latest from the feed</h2>
          <Link href="/deals" className="text-sm text-[color:var(--color-accent)]">
            View all
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {dealFeedItems.slice(0, 2).map((deal) => (
            <DealCard
              key={deal.id}
              deal={deal}
              store={deal.storeSlug ? storeBySlug.get(deal.storeSlug) : undefined}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
