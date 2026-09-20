import type { Coupon, DealFeedItem, WishlistWithVerdict } from "@coupon-app/shared";

/** Cumulative count over time, ordered by an ISO timestamp — real growth, not a fabricated curve. */
export function cumulativeCount(dates: (string | null)[]): number[] {
  const sorted = dates.filter((d): d is string => Boolean(d)).sort();
  return sorted.map((_, i) => i + 1);
}

export function trackedGrowth(wishlist: WishlistWithVerdict[]): number[] {
  return cumulativeCount(wishlist.map((item) => item.createdAt));
}

export function verifiedGrowth(coupons: Coupon[]): number[] {
  return cumulativeCount(
    coupons.filter((c) => c.verifiedStatus === "verified").map((c) => c.lastVerifiedAt),
  );
}

/** Deals posted per day, most recent bucket last — a real distribution from the feed. */
export function dealsPerDay(deals: DealFeedItem[], days = 7): number[] {
  if (deals.length === 0) return [];
  const buckets = new Array(days).fill(0);
  const latest = Math.max(...deals.map((d) => new Date(d.postedAt).getTime()));
  deals.forEach((deal) => {
    const diffDays = Math.floor((latest - new Date(deal.postedAt).getTime()) / 86_400_000);
    const idx = days - 1 - diffDays;
    if (idx >= 0 && idx < days) buckets[idx] += 1;
  });
  return buckets;
}

/** Percentile spread across the wishlist items that already have a verdict. */
export function verdictSpread(wishlist: WishlistWithVerdict[]): number[] {
  return wishlist
    .filter((item) => item.verdict.status === "verdict")
    .map((item) => item.verdict.percentile!)
    .sort((a, b) => a - b);
}
