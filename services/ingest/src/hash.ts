import { createHash } from "node:crypto";
import type { DealFeedItem } from "@coupon-app/shared";

/**
 * Strips volatile tracking query params before hashing so the same deal
 * produces a stable id across ingest runs. This only affects the hash input
 * — the stored `url` field is written through untouched (no stripping or
 * altering of links/referral codes, per DealNews' terms).
 */
function normalizeUrlForHash(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.hostname.toLowerCase()}${parsed.pathname}`;
  } catch {
    return url.trim().toLowerCase();
  }
}

/** A stable `id`/`dedupeKey` pair, derived from a hash of the (normalized) url. */
export function stableDealId(
  source: DealFeedItem["source"],
  url: string,
): { id: string; dedupeKey: string } {
  const hash = createHash("sha1").update(normalizeUrlForHash(url)).digest("hex").slice(0, 12);
  return { id: `${source}-${hash}`, dedupeKey: `${source}:${hash}` };
}
