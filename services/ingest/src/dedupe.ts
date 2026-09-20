import type { DealFeedItem } from "@coupon-app/shared";

/** Dedupes by `id` (itself a hash of the normalized url), keeping the first
 * occurrence — earlier sources in the input order win. */
export function dedupeDealFeedItems(items: DealFeedItem[]): DealFeedItem[] {
  const seen = new Map<string, DealFeedItem>();
  for (const item of items) {
    if (!seen.has(item.id)) seen.set(item.id, item);
  }
  return [...seen.values()];
}
