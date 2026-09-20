/**
 * Read-only data access + Trust Law framing for the Deal Brain MCP server.
 * Pure functions over `@coupon-app/shared` — no I/O, no writes, nothing
 * MCP-specific, so this is unit-testable without a transport.
 */
import {
  computeVerdict,
  coupons,
  currentPrices,
  dealFeedItems,
  getWishlistWithVerdicts,
  isLiveDealFeed,
  NOW,
  percentileRank,
  priceHistories,
  products,
  stores,
  type Coupon,
  type DealFeedItem,
  type Product,
  type StoreSlug,
} from "@coupon-app/shared";

/** Phase 1 honesty floor: product/price/wishlist data are typed fixtures, not
 * a live Best Buy/Walmart feed yet (see packages/shared/src/fixtures.ts). */
export const SAMPLE_DATA_NOTE =
  "Deal Brain is in Phase 1: product, price-history, and wishlist data are typed sample fixtures, " +
  "not a live Best Buy/Walmart feed yet. Treat figures as illustrative, not a live market check.";

/** Trust Law #6: every context (non-verdict) result must say so, plainly,
 * every time. */
export const CONTEXT_CAVEAT =
  "This is context based on public/sample data, not a live check of your exact item — " +
  "never treat it as a confirmed live verdict.";

const TRACKED_STORE_SLUGS = new Set<StoreSlug>(["best_buy", "walmart"]);

const STORE_SLUG_ALIASES: Record<string, StoreSlug> = {
  bestbuy: "best_buy",
  "best buy": "best_buy",
  best_buy: "best_buy",
  walmart: "walmart",
  amazon: "amazon",
  microcenter: "micro_center",
  "micro center": "micro_center",
  micro_center: "micro_center",
};

/** Normalizes free-text store input ("Best Buy", "bestbuy", ...) to a known
 * `StoreSlug`, or `null` when it doesn't match any store on the roster. */
export function normalizeStoreSlug(input: string): StoreSlug | null {
  return STORE_SLUG_ALIASES[input.trim().toLowerCase()] ?? null;
}

/** Finds a product by exact id, or a case-insensitive substring match against
 * title/brand/known retailer identifiers. Returns the first match — Phase 1
 * fixtures are small enough that this is unambiguous in practice. */
export function findProduct(query?: string, id?: string): Product | undefined {
  if (id) return products.find((p) => p.id === id);
  if (!query) return undefined;
  const needle = query.trim().toLowerCase();
  if (!needle) return undefined;
  return products.find((p) => {
    const identifiers = [p.upc, p.gtin, p.asin, p.wpid, p.sku].filter((v): v is string => v != null);
    return (
      p.title.toLowerCase().includes(needle) ||
      (p.brand?.toLowerCase().includes(needle) ?? false) ||
      identifiers.some((v) => v.toLowerCase() === needle)
    );
  });
}

export interface PriceHistorySummary {
  count: number;
  minPrice: number;
  maxPrice: number;
  avgPrice: number;
  earliestCapturedAt: string;
  latestCapturedAt: string;
}

/** Own-logged price-history summary for a product (R-05), never the raw log
 * — callers get a summary, not something they could mistake for a full feed. */
export function summarizeHistory(productId: string): PriceHistorySummary | null {
  const history = priceHistories[productId] ?? [];
  if (history.length === 0) return null;
  const prices = history.map((h) => h.price);
  const capturedTimes = history.map((h) => new Date(h.capturedAt).getTime());
  return {
    count: history.length,
    minPrice: Math.min(...prices),
    maxPrice: Math.max(...prices),
    avgPrice: Math.round((prices.reduce((sum, p) => sum + p, 0) / prices.length) * 100) / 100,
    earliestCapturedAt: new Date(Math.min(...capturedTimes)).toISOString(),
    latestCapturedAt: new Date(Math.max(...capturedTimes)).toISOString(),
  };
}

/** Only `verified` coupons are surfaced — Trust Law: never hand back an
 * `unverified`/`quarantined` code as if it were usable. */
function isTrustworthy(coupon: Coupon): boolean {
  return coupon.verifiedStatus === "verified";
}

/** Verified coupons matching a product, either product-specific or
 * store-wide (no `productId`), each carrying its own success rate. */
export function matchingCoupons(productId: string): Coupon[] {
  return coupons.filter((c) => c.productId === productId && isTrustworthy(c));
}

export function storewideCoupons(): Coupon[] {
  return coupons.filter((c) => c.productId === null && isTrustworthy(c));
}

export function buildWishlistPayload() {
  return {
    dataSource: "sample-fixture" as const,
    note: SAMPLE_DATA_NOTE,
    items: getWishlistWithVerdicts().map((entry) => ({
      id: entry.id,
      product: {
        id: entry.product.id,
        title: entry.product.title,
        brand: entry.product.brand,
        category: entry.product.category,
      },
      currentPrice: entry.currentPrice,
      threshold: { type: entry.thresholdType, value: entry.thresholdValue },
      verdict: entry.verdict,
    })),
  };
}

export function buildProductContext(query?: string, id?: string) {
  const product = findProduct(query, id);
  if (!product) {
    return {
      found: false as const,
      dataSource: "sample-fixture" as const,
      note: SAMPLE_DATA_NOTE,
      message: `No product matched ${id ? `id "${id}"` : `query "${query ?? ""}"`} in Deal Brain's catalog.`,
    };
  }

  const currentPrice = currentPrices[product.id] ?? null;
  const verdict = currentPrice != null ? computeVerdict(currentPrice, priceHistories[product.id] ?? [], NOW) : null;

  return {
    found: true as const,
    dataSource: "sample-fixture" as const,
    note: SAMPLE_DATA_NOTE,
    product,
    currentPrice,
    priceHistory: summarizeHistory(product.id),
    verdict,
    coupons: {
      productSpecific: matchingCoupons(product.id),
      storewide: storewideCoupons(),
    },
    stores: stores.map((s) => ({
      slug: s.slug,
      name: s.name,
      role: s.role,
    })),
  };
}

export function searchDeals(query: string) {
  const needle = query.trim().toLowerCase();
  const matches: DealFeedItem[] = needle
    ? dealFeedItems.filter((d) => d.title.toLowerCase().includes(needle))
    : dealFeedItems;

  return {
    dataSource: isLiveDealFeed ? ("live-ingested" as const) : ("sample-fixture" as const),
    note: isLiveDealFeed
      ? "Live-ingested from Woot/DealNews/Slickdeals (services/ingest) as of the last successful run."
      : "services/ingest hasn't produced deals-live.json yet — these are the stubbed sample deals.",
    matches: matches.slice(0, 20),
  };
}

export interface CheckPriceInput {
  item: string;
  price: number;
  store: string;
}

export function checkPrice({ item, price, store }: CheckPriceInput) {
  const now = new Date();
  const product = findProduct(item);
  const storeSlug = normalizeStoreSlug(store);
  const isTrackedStore = storeSlug != null && TRACKED_STORE_SLUGS.has(storeSlug);

  if (product && isTrackedStore) {
    const history = priceHistories[product.id] ?? [];
    const verdict = computeVerdict(price, history, now);
    const resultType = verdict.status === "verdict" ? ("verdict" as const) : ("context" as const);
    return {
      resultType,
      confidence: verdict.confidenceLabel,
      sourcesUsed: [`own-price-history:${product.id}`],
      checkedAt: now.toISOString(),
      dataNote: SAMPLE_DATA_NOTE,
      trustCaveat: resultType === "context" ? CONTEXT_CAVEAT : undefined,
      matchedProduct: { id: product.id, title: product.title },
      verdict,
      basis:
        resultType === "verdict"
          ? `Matched to tracked SKU "${product.title}"; percentile computed against ${verdict.daysOfHistory} days of its own price history.`
          : `Matched to tracked SKU "${product.title}", but only ${verdict.daysOfHistory} day(s) of history exist ` +
            `(need ${verdict.daysUntilVerdict} more) — too early for an honest verdict.`,
    };
  }

  if (product && !isTrackedStore) {
    const history = priceHistories[product.id] ?? [];
    const percentile = history.length > 0 ? percentileRank(price, history.map((h) => h.price)) : null;
    return {
      resultType: "context" as const,
      confidence: "low" as const,
      sourcesUsed: [`comparator:${product.id}@tracked-stores`],
      checkedAt: now.toISOString(),
      dataNote: SAMPLE_DATA_NOTE,
      trustCaveat: CONTEXT_CAVEAT,
      matchedProduct: { id: product.id, title: product.title },
      comparatorPercentile: percentile,
      basis:
        `"${store}" isn't a tracked store (Best Buy/Walmart only), so this can't be confirmed as your exact ` +
        `listing — using our tracked-store history for "${product.title}" as a rough, possibly-different-SKU comparator only.`,
    };
  }

  return {
    resultType: "context" as const,
    confidence: "low" as const,
    sourcesUsed: [],
    checkedAt: now.toISOString(),
    dataNote: SAMPLE_DATA_NOTE,
    trustCaveat: CONTEXT_CAVEAT,
    matchedProduct: null,
    basis: `No matching item found in Deal Brain's tracked catalog or sample data for "${item}" — zero corroboration available.`,
  };
}
