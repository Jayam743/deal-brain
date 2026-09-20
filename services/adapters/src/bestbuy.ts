import type { Product } from "@coupon-app/shared";

/**
 * Best Buy Developer API client (https://bestbuyapis.github.io/api-documentation/).
 * Free-tier key, read from the server-only `BEST_BUY_API_KEY` env var — never
 * `NEXT_PUBLIC_` (that would ship it to the browser). Every export here
 * returns a typed `BestBuyResult` rather than throwing when the key is
 * absent, so callers can fall back to fixtures and the app never crashes.
 */
const BEST_BUY_BASE_URL = "https://api.bestbuy.com/v1";

export type BestBuyResult<T> =
  | { ok: true; data: T }
  | { ok: false; reason: "not_configured" }
  | { ok: false; reason: "not_found" }
  | { ok: false; reason: "invalid_data" }
  | { ok: false; reason: "http_error"; status: number }
  | { ok: false; reason: "network_error"; error: unknown };

/**
 * A Best Buy product mapped onto the shared catalog/price shapes.
 * `id`/`gtin`/`asin`/`wpid` are left to the caller (DB-assigned, or simply
 * not knowable from Best Buy) — `product.sku` carries the Best Buy
 * identifier for identifier-exact matching (R-01, NG-7).
 */
export interface BestBuyProductMatch {
  product: Pick<Product, "title" | "brand" | "imageUrl" | "upc" | "sku"> & { category: string };
  price: BestBuyPriceQuote;
}

export interface BestBuyPriceQuote {
  sku: string;
  price: number;
  currency: "USD";
  /** The pre-sale price, only when Best Buy reports the item as on sale
   * and it differs from the current price — never fabricated otherwise. */
  wasPrice: number | null;
  capturedAt: string;
}

export interface BestBuyStoreAvailability {
  storeId: string;
  name: string;
  city: string;
  region: string;
  postalCode: string;
  distanceMiles: number | null;
  /** A store appearing in the SKU+area `stores.json` response means Best
   * Buy's own API is asserting it carries this SKU in that area — this
   * adapter doesn't fabricate a live quantity Best Buy doesn't return. */
  inStock: true;
}

interface RawBestBuyProduct {
  sku: number | string;
  name: string;
  manufacturer?: string | null;
  salePrice?: number | null;
  regularPrice?: number | null;
  onSale?: boolean;
  image?: string | null;
  upc?: string | null;
  class?: string | null;
  department?: string | null;
}

interface RawBestBuyProductsResponse {
  products?: RawBestBuyProduct[];
}

interface RawBestBuyStore {
  storeId: number | string;
  name: string;
  city: string;
  region: string;
  fullPostalCode: string;
  distance?: number | null;
}

interface RawBestBuyStoresResponse {
  stores?: RawBestBuyStore[];
}

export function isBestBuyConfigured(
  apiKey: string | undefined = process.env.BEST_BUY_API_KEY,
): boolean {
  return Boolean(apiKey);
}

/** Pure mapper: a single raw Best Buy product -> the shared catalog + price
 * shape. Exported (and tested) standalone so the mapping logic doesn't
 * require a network call to verify. Returns `null` — never a fabricated
 * price — when the data Best Buy sent isn't usable: no `sku`, or both
 * `salePrice` and `regularPrice` missing (Trust Law: no synthesized $0). */
export function mapBestBuyProduct(
  raw: RawBestBuyProduct,
  capturedAt: string = new Date().toISOString(),
): BestBuyProductMatch | null {
  if (raw.sku == null) return null;
  if (raw.salePrice == null && raw.regularPrice == null) return null;

  const sku = String(raw.sku);
  const price = raw.salePrice ?? raw.regularPrice ?? 0;
  const regularPrice = raw.regularPrice ?? null;
  const wasPrice =
    raw.onSale && regularPrice !== null && regularPrice !== price ? regularPrice : null;

  return {
    product: {
      title: raw.name,
      brand: raw.manufacturer ?? null,
      imageUrl: raw.image ?? null,
      upc: raw.upc ?? null,
      sku,
      // Best Buy's category taxonomy doesn't line up 1:1 with ours; `class`
      // is the closest human-readable field it returns. Fall back rather
      // than leaving the (non-nullable) category empty.
      category: raw.class ?? raw.department ?? "Uncategorized",
    },
    price: { sku, price, currency: "USD", wasPrice, capturedAt },
  };
}

function buildUrl(pathAndFilter: string, apiKey: string, extraQueryParams: string[] = []): string {
  const query = new URLSearchParams({ apiKey, format: "json" });
  const base = `${BEST_BUY_BASE_URL}${pathAndFilter}?${query.toString()}`;
  return extraQueryParams.length > 0 ? `${base}&${extraQueryParams.join("&")}` : base;
}

async function fetchBestBuy<T>(url: string): Promise<BestBuyResult<T>> {
  try {
    const response = await fetch(url, { headers: { accept: "application/json" } });
    if (!response.ok) return { ok: false, reason: "http_error", status: response.status };
    return { ok: true, data: (await response.json()) as T };
  } catch (error) {
    return { ok: false, reason: "network_error", error };
  }
}

const PRODUCT_FIELDS =
  "sku,name,manufacturer,salePrice,regularPrice,onSale,image,upc,class,department";

/** Product lookup by SKU (Products API, `sku=` filter). */
export async function lookupProductBySku(
  sku: string,
  apiKey: string | undefined = process.env.BEST_BUY_API_KEY,
): Promise<BestBuyResult<BestBuyProductMatch>> {
  if (!apiKey) return { ok: false, reason: "not_configured" };

  const url = buildUrl(`/products(sku=${encodeURIComponent(sku)})`, apiKey, [
    `show=${PRODUCT_FIELDS}`,
  ]);
  const result = await fetchBestBuy<RawBestBuyProductsResponse>(url);
  if (!result.ok) return result;

  const raw = result.data.products?.[0];
  if (!raw) return { ok: false, reason: "not_found" };
  const match = mapBestBuyProduct(raw);
  if (!match) return { ok: false, reason: "invalid_data" };
  return { ok: true, data: match };
}

/** Keyword search (Products API, `search=` filter). */
export async function searchProducts(
  query: string,
  apiKey: string | undefined = process.env.BEST_BUY_API_KEY,
): Promise<BestBuyResult<BestBuyProductMatch[]>> {
  if (!apiKey) return { ok: false, reason: "not_configured" };

  const url = buildUrl(`/products(search=${encodeURIComponent(query)})`, apiKey, [
    `show=${PRODUCT_FIELDS}`,
    "pageSize=10",
  ]);
  const result = await fetchBestBuy<RawBestBuyProductsResponse>(url);
  if (!result.ok) return result;

  // Best Buy occasionally sends listings with no usable price — dropped
  // rather than fabricated (Trust Law), so the caller still gets the rest.
  const data = (result.data.products ?? [])
    .map((raw) => mapBestBuyProduct(raw))
    .filter((match): match is BestBuyProductMatch => match !== null);
  return { ok: true, data };
}

/**
 * Store-level availability for a SKU near a postal code (the Products API's
 * `stores.json` sub-resource, filtered with Best Buy's `area(zip,radius)`
 * criteria syntax). Local-availability feature (F9's in-store half).
 */
export async function getStoreAvailability(
  sku: string,
  postalCode: string,
  apiKey: string | undefined = process.env.BEST_BUY_API_KEY,
): Promise<BestBuyResult<BestBuyStoreAvailability[]>> {
  if (!apiKey) return { ok: false, reason: "not_configured" };

  const url = buildUrl(`/products/${encodeURIComponent(sku)}/stores.json`, apiKey, [
    `area(${encodeURIComponent(postalCode)},25)`,
    "show=storeId,name,city,region,fullPostalCode,distance",
  ]);
  const result = await fetchBestBuy<RawBestBuyStoresResponse>(url);
  if (!result.ok) return result;

  const stores: BestBuyStoreAvailability[] = (result.data.stores ?? []).map((store) => ({
    storeId: String(store.storeId),
    name: store.name,
    city: store.city,
    region: store.region,
    postalCode: store.fullPostalCode,
    distanceMiles: store.distance ?? null,
    inStock: true,
  }));
  return { ok: true, data: stores };
}
