import type { Product, StoreSlug } from "@coupon-app/shared";

/**
 * A deal's outbound link points at a fixture URL that doesn't resolve to a
 * real listing (Phase 1 has no live store adapters yet). Rather than fake a
 * deep link, we send the shopper to a real, working search for the same
 * product at the named store — honest about what it is (a search, not a
 * guaranteed match).
 */
const STORE_SEARCH: Record<StoreSlug, { name: string; searchUrl: (query: string) => string }> = {
  best_buy: {
    name: "Best Buy",
    searchUrl: (query) => `https://www.bestbuy.com/site/searchpage.jsp?st=${query}`,
  },
  walmart: {
    name: "Walmart",
    searchUrl: (query) => `https://www.walmart.com/search?q=${query}`,
  },
  amazon: {
    name: "Amazon",
    searchUrl: (query) => `https://www.amazon.com/s?k=${query}`,
  },
  micro_center: {
    name: "Micro Center",
    searchUrl: (query) => `https://www.microcenter.com/search/search_results.aspx?Ntt=${query}`,
  },
};

export interface StoreSearchLink {
  label: string;
  href: string;
}

/** Builds a real, working search-URL for a deal's title, scoped to its store when known. */
export function buildStoreSearchLink(title: string, storeSlug: StoreSlug | null): StoreSearchLink {
  const query = encodeURIComponent(title);
  const target = storeSlug ? STORE_SEARCH[storeSlug] : undefined;
  if (!target) {
    return { label: "Search the web", href: `https://www.google.com/search?q=${query}` };
  }
  return { label: `Search at ${target.name}`, href: target.searchUrl(query) };
}

/**
 * Per-store field on Product holding a real exact-product identifier, when
 * we have one. Micro Center has no stable public identifier in our data, so
 * it's intentionally absent here and always falls back to search.
 */
const EXACT_PRODUCT_URL: Partial<Record<StoreSlug, (product: Product) => string | null>> = {
  amazon: (product) =>
    product.asin ? `https://www.amazon.com/dp/${encodeURIComponent(product.asin)}` : null,
  best_buy: (product) =>
    product.sku
      ? `https://www.bestbuy.com/site/-/${encodeURIComponent(product.sku)}.p?skuId=${encodeURIComponent(product.sku)}`
      : null,
  walmart: (product) =>
    product.wpid ? `https://www.walmart.com/ip/${encodeURIComponent(product.wpid)}` : null,
};

/**
 * Builds the "Open <Store>" link for a product: an exact-product deep link
 * when the product carries that store's real identifier (ASIN, Best Buy
 * SKU, Walmart WPID), else the same honest search fallback as
 * buildStoreSearchLink. Today's fixture identifiers are sample data, so this
 * mostly falls back to search — a fake id would 404, search actually
 * resolves — but it auto-upgrades to exact links once real per-store
 * product data lands.
 */
export function buildStoreProductLink(
  product: Product,
  storeSlug: StoreSlug | null,
): StoreSearchLink {
  const exactUrl = storeSlug ? EXACT_PRODUCT_URL[storeSlug]?.(product) : null;
  if (exactUrl) {
    return { label: `Open ${STORE_SEARCH[storeSlug as StoreSlug].name}`, href: exactUrl };
  }
  return buildStoreSearchLink(product.title, storeSlug);
}
