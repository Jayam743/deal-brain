import { currentPrices, products, wishlistItems } from "@coupon-app/shared";
import { isBestBuyConfigured, lookupProductBySku } from "./bestbuy";
import { logPriceIfNeeded, resolvePriceStore, type PriceLogRecord } from "./price-store";

interface TrackedSku {
  sku: string;
  productId: string;
}

/**
 * Demo-mode source of tracked SKUs: every wishlisted product that has a
 * Best Buy SKU on file. Once wishlist reads move to Supabase, swap this for
 * a query against `wishlist_items` joined to `products.sku` — the
 * logging/idempotency logic below doesn't change either way.
 */
export function getTrackedSkusFromFixtures(): TrackedSku[] {
  const wishlistedProductIds = new Set(wishlistItems.map((item) => item.productId));
  return products
    .filter(
      (product): product is typeof product & { sku: string } =>
        wishlistedProductIds.has(product.id) && Boolean(product.sku),
    )
    .map((product) => ({ sku: product.sku, productId: product.id }));
}

/**
 * Current price for a tracked SKU: the live Best Buy adapter when a key is
 * configured, else the fixture price for that product — so the logger
 * (and the app) never breaks with zero env vars set.
 */
export async function priceForTrackedSku(
  tracked: TrackedSku,
  capturedAt: string,
): Promise<PriceLogRecord> {
  if (isBestBuyConfigured()) {
    const result = await lookupProductBySku(tracked.sku);
    if (result.ok) {
      return { ...result.data.price, capturedAt };
    }
    console.warn(
      `[log-prices] Best Buy lookup failed for sku ${tracked.sku} (${result.reason}) — using fixture price.`,
    );
  }

  return {
    sku: tracked.sku,
    price: currentPrices[tracked.productId] ?? 0,
    currency: "USD",
    wasPrice: null,
    capturedAt,
  };
}

async function main() {
  const store = resolvePriceStore();
  const capturedAt = new Date().toISOString();
  const tracked = getTrackedSkusFromFixtures();

  if (tracked.length === 0) {
    console.log("[log-prices] No tracked SKUs found — nothing to log.");
    return;
  }

  let logged = 0;
  let skipped = 0;
  let failed = 0;
  for (const item of tracked) {
    try {
      const record = await priceForTrackedSku(item, capturedAt);
      const outcome = await logPriceIfNeeded(store, record);
      if (outcome === "logged") logged += 1;
      else skipped += 1;
    } catch (error) {
      // One un-migrated/misbehaving SKU shouldn't abort the whole day's
      // logging run — isolate it and keep going.
      failed += 1;
      console.error(`[log-prices] Failed to log sku ${item.sku}.`, error);
    }
  }

  console.log(
    `[log-prices] Logged ${logged} price(s), skipped ${skipped} already logged today, ${failed} failed.`,
  );
  if (failed > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error("[log-prices] Unexpected failure.", error);
  process.exitCode = 1;
});
