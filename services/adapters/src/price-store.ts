import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export interface PriceLogRecord {
  sku: string;
  price: number;
  currency: "USD";
  wasPrice: number | null;
  capturedAt: string;
}

/** YYYY-MM-DD (UTC) — the unit of "once per SKU per day" idempotency. */
export function dayKey(isoTimestamp: string): string {
  return isoTimestamp.slice(0, 10);
}

export interface PriceStore {
  hasLoggedToday(sku: string, day: string): Promise<boolean>;
  append(record: PriceLogRecord): Promise<void>;
}

/**
 * Demo-mode fallback store: a local JSON file, so `pnpm log-prices` (and its
 * one-row-per-SKU-per-day guarantee) works with zero env vars set. Never
 * used once Supabase is configured — see `resolvePriceStore` below.
 */
export class LocalJsonPriceStore implements PriceStore {
  constructor(private readonly filePath: string) {}

  private readAll(): PriceLogRecord[] {
    if (!existsSync(this.filePath)) return [];
    try {
      const parsed = JSON.parse(readFileSync(this.filePath, "utf8")) as unknown;
      return Array.isArray(parsed) ? (parsed as PriceLogRecord[]) : [];
    } catch {
      // A corrupt/partial write shouldn't ever break the logger.
      return [];
    }
  }

  async hasLoggedToday(sku: string, day: string): Promise<boolean> {
    return this.readAll().some((record) => record.sku === sku && dayKey(record.capturedAt) === day);
  }

  async append(record: PriceLogRecord): Promise<void> {
    const all = this.readAll();
    all.push(record);
    mkdirSync(path.dirname(this.filePath), { recursive: true });
    writeFileSync(this.filePath, `${JSON.stringify(all, null, 2)}\n`, "utf8");
  }
}

/**
 * Supabase-backed store, written via PostgREST + the server-only service
 * role key (bypasses RLS, per supabase/migrations/0002_rls.sql). `prices`
 * rows FK to `store_listings`/`products` (0001_init.sql), so a SKU's
 * best_buy listing is resolved (and upserted if missing) before insert.
 */
export class SupabasePriceStore implements PriceStore {
  constructor(
    private readonly url: string,
    private readonly serviceRoleKey: string,
  ) {}

  private headers(extra: Record<string, string> = {}): Record<string, string> {
    return {
      apikey: this.serviceRoleKey,
      authorization: `Bearer ${this.serviceRoleKey}`,
      "content-type": "application/json",
      ...extra,
    };
  }

  private async resolveListing(
    sku: string,
  ): Promise<{ productId: string; storeListingId: string } | null> {
    const productRes = await fetch(
      `${this.url}/rest/v1/products?sku=eq.${encodeURIComponent(sku)}&select=id&limit=1`,
      { headers: this.headers() },
    );
    if (!productRes.ok) return null;
    const products = (await productRes.json()) as { id: string }[];
    const productId = products[0]?.id;
    // This logger tracks prices for existing catalog products only — it
    // doesn't create new products (that's the adapter's product-lookup path).
    if (!productId) return null;

    const storeRes = await fetch(
      `${this.url}/rest/v1/store_retailers?slug=eq.best_buy&select=id&limit=1`,
      {
        headers: this.headers(),
      },
    );
    if (!storeRes.ok) return null;
    const storeRetailerId = ((await storeRes.json()) as { id: string }[])[0]?.id;
    if (!storeRetailerId) return null;

    const upsertRes = await fetch(
      `${this.url}/rest/v1/store_listings?on_conflict=store_retailer_id,external_id`,
      {
        method: "POST",
        headers: this.headers({ prefer: "resolution=merge-duplicates,return=representation" }),
        body: JSON.stringify([
          {
            product_id: productId,
            store_retailer_id: storeRetailerId,
            external_id: sku,
            external_url: `https://www.bestbuy.com/site/${sku}.p`,
          },
        ]),
      },
    );
    if (!upsertRes.ok) return null;
    const storeListingId = ((await upsertRes.json()) as { id: string }[])[0]?.id;
    if (!storeListingId) return null;

    return { productId, storeListingId };
  }

  async hasLoggedToday(sku: string, day: string): Promise<boolean> {
    const listing = await this.resolveListing(sku);
    if (!listing) return false;

    const start = `${day}T00:00:00.000Z`;
    const end = `${day}T23:59:59.999Z`;
    const res = await fetch(
      `${this.url}/rest/v1/prices?product_id=eq.${listing.productId}` +
        `&captured_at=gte.${start}&captured_at=lte.${end}&select=id&limit=1`,
      { headers: this.headers() },
    );
    if (!res.ok) return false;
    return ((await res.json()) as unknown[]).length > 0;
  }

  async append(record: PriceLogRecord): Promise<void> {
    // Defends against any upstream bad value reaching permanent price
    // history — never persist a fabricated/nonsensical price.
    if (record.price == null || record.price <= 0) {
      throw new Error(
        `[log-prices] Refusing to persist a non-positive price (${String(record.price)}) for sku ${record.sku}.`,
      );
    }

    const listing = await this.resolveListing(record.sku);
    if (!listing) {
      throw new Error(`[log-prices] No catalog product found for sku ${record.sku} — skipping.`);
    }

    const res = await fetch(`${this.url}/rest/v1/prices`, {
      method: "POST",
      // `resolution=ignore-duplicates` plus the `prices_listing_day_uidx`
      // constraint (0004_prices_unique.sql) makes a concurrent/retried
      // insert for the same listing+day a no-op rather than a duplicate
      // row — belt-and-suspenders with the 409 handling below, since a
      // conflict on that constraint (not the primary key) still surfaces
      // as an error status rather than being silently ignored.
      headers: this.headers({ prefer: "return=minimal,resolution=ignore-duplicates" }),
      body: JSON.stringify([
        {
          store_listing_id: listing.storeListingId,
          product_id: listing.productId,
          price: record.price,
          currency: record.currency,
          was_price: record.wasPrice,
          captured_at: record.capturedAt,
        },
      ]),
    });
    // A 409 here means the day-uniqueness constraint already rejected a
    // duplicate for this listing/day — that's success, not failure.
    if (!res.ok && res.status !== 409) {
      throw new Error(`[log-prices] Supabase insert failed: ${res.status}`);
    }
  }
}

const LOCAL_STORE_PATH = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "../data/price-log.local.json",
);

/** Supabase when the server env is configured, else the local JSON demo
 * store — so `pnpm log-prices` runs with zero env vars set. */
export function resolvePriceStore(): PriceStore {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (url && serviceRoleKey) return new SupabasePriceStore(url, serviceRoleKey);
  return new LocalJsonPriceStore(LOCAL_STORE_PATH);
}

/** One row per SKU per day: skips silently (returns "skipped") if this SKU
 * already has an observation logged for `record.capturedAt`'s day. */
export async function logPriceIfNeeded(
  store: PriceStore,
  record: PriceLogRecord,
): Promise<"logged" | "skipped"> {
  const day = dayKey(record.capturedAt);
  if (await store.hasLoggedToday(record.sku, day)) return "skipped";
  await store.append(record);
  return "logged";
}
