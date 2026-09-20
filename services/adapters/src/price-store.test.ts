import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  dayKey,
  LocalJsonPriceStore,
  logPriceIfNeeded,
  SupabasePriceStore,
  type PriceLogRecord,
} from "./price-store";

describe("dayKey", () => {
  it("extracts the UTC calendar day from an ISO timestamp", () => {
    expect(dayKey("2026-09-15T09:00:00.000Z")).toBe("2026-09-15");
    expect(dayKey("2026-09-15T23:59:59.999Z")).toBe("2026-09-15");
  });
});

describe("LocalJsonPriceStore + logPriceIfNeeded", () => {
  let dir: string;
  let filePath: string;
  let store: LocalJsonPriceStore;

  beforeEach(() => {
    dir = mkdtempSync(path.join(tmpdir(), "price-log-test-"));
    filePath = path.join(dir, "price-log.json");
    store = new LocalJsonPriceStore(filePath);
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  function record(overrides: Partial<PriceLogRecord> = {}): PriceLogRecord {
    return {
      sku: "6567938",
      price: 549.99,
      currency: "USD",
      wasPrice: null,
      capturedAt: "2026-09-15T09:00:00.000Z",
      ...overrides,
    };
  }

  it("logs a fresh SKU/day and writes exactly one row", async () => {
    const outcome = await logPriceIfNeeded(store, record());
    expect(outcome).toBe("logged");

    const rows = JSON.parse(readFileSync(filePath, "utf8")) as PriceLogRecord[];
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ sku: "6567938", price: 549.99 });
  });

  it("skips a second call for the same SKU on the same day — no duplicate row", async () => {
    await logPriceIfNeeded(store, record({ capturedAt: "2026-09-15T09:00:00.000Z" }));
    const second = await logPriceIfNeeded(
      store,
      record({ capturedAt: "2026-09-15T18:00:00.000Z", price: 539.99 }),
    );

    expect(second).toBe("skipped");
    const rows = JSON.parse(readFileSync(filePath, "utf8")) as PriceLogRecord[];
    expect(rows).toHaveLength(1);
    expect(rows[0]?.price).toBe(549.99); // the first write wins; no overwrite
  });

  it("logs again for the same SKU on a new day", async () => {
    await logPriceIfNeeded(store, record({ capturedAt: "2026-09-15T09:00:00.000Z" }));
    const next = await logPriceIfNeeded(store, record({ capturedAt: "2026-09-16T09:00:00.000Z" }));

    expect(next).toBe("logged");
    const rows = JSON.parse(readFileSync(filePath, "utf8")) as PriceLogRecord[];
    expect(rows).toHaveLength(2);
  });

  it("logs independently per SKU on the same day", async () => {
    await logPriceIfNeeded(store, record({ sku: "6567938" }));
    const other = await logPriceIfNeeded(store, record({ sku: "6534920" }));

    expect(other).toBe("logged");
    const rows = JSON.parse(readFileSync(filePath, "utf8")) as PriceLogRecord[];
    expect(rows).toHaveLength(2);
  });
});

describe("SupabasePriceStore", () => {
  const SUPABASE_URL = "https://example.supabase.co";
  const SERVICE_ROLE_KEY = "test-service-role-key";

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function record(overrides: Partial<PriceLogRecord> = {}): PriceLogRecord {
    return {
      sku: "6567938",
      price: 549.99,
      currency: "USD",
      wasPrice: null,
      capturedAt: "2026-09-15T09:00:00.000Z",
      ...overrides,
    };
  }

  function jsonResponse(body: unknown, init: { ok?: boolean; status?: number } = {}) {
    return { ok: init.ok ?? true, status: init.status ?? 200, json: async () => body };
  }

  /** Routes the fetch mock for the `resolveListing` fan-out every
   * `hasLoggedToday`/`append` call makes, plus the two endpoints unique to
   * each of them (`prices?...` GET vs. `prices` POST). */
  function buildFetchMock(routes: {
    products?: ReturnType<typeof jsonResponse>;
    storeRetailers?: ReturnType<typeof jsonResponse>;
    storeListings?: ReturnType<typeof jsonResponse>;
    pricesGet?: ReturnType<typeof jsonResponse>;
    pricesPost?: ReturnType<typeof jsonResponse>;
  }) {
    return vi.fn(async (url: string, options: RequestInit = {}) => {
      const method = options.method ?? "GET";
      if (url.includes("/rest/v1/products?")) return routes.products ?? jsonResponse([]);
      if (url.includes("/rest/v1/store_retailers?")) return routes.storeRetailers ?? jsonResponse([]);
      if (url.includes("/rest/v1/store_listings?")) return routes.storeListings ?? jsonResponse([]);
      if (url.includes("/rest/v1/prices?") && method === "GET") return routes.pricesGet ?? jsonResponse([]);
      if (url.includes("/rest/v1/prices") && method === "POST")
        return routes.pricesPost ?? jsonResponse([], { status: 201 });
      throw new Error(`Unhandled fetch in test: ${method} ${url}`);
    });
  }

  const resolvedListingRoutes = {
    products: jsonResponse([{ id: "product-1" }]),
    storeRetailers: jsonResponse([{ id: "retailer-1" }]),
    storeListings: jsonResponse([{ id: "listing-1" }]),
  };

  describe("hasLoggedToday", () => {
    it("returns true when a price row already exists for that listing/day", async () => {
      const fetchMock = buildFetchMock({
        ...resolvedListingRoutes,
        pricesGet: jsonResponse([{ id: "price-1" }]),
      });
      vi.stubGlobal("fetch", fetchMock);
      const store = new SupabasePriceStore(SUPABASE_URL, SERVICE_ROLE_KEY);

      await expect(store.hasLoggedToday("6567938", "2026-09-15")).resolves.toBe(true);
    });

    it("returns false when no price row exists for that listing/day", async () => {
      const fetchMock = buildFetchMock({ ...resolvedListingRoutes, pricesGet: jsonResponse([]) });
      vi.stubGlobal("fetch", fetchMock);
      const store = new SupabasePriceStore(SUPABASE_URL, SERVICE_ROLE_KEY);

      await expect(store.hasLoggedToday("6567938", "2026-09-15")).resolves.toBe(false);
    });

    it("fails open (returns false, doesn't throw) when the day-lookup request errors", async () => {
      const fetchMock = buildFetchMock({
        ...resolvedListingRoutes,
        pricesGet: jsonResponse({ message: "boom" }, { ok: false, status: 500 }),
      });
      vi.stubGlobal("fetch", fetchMock);
      const store = new SupabasePriceStore(SUPABASE_URL, SERVICE_ROLE_KEY);

      await expect(store.hasLoggedToday("6567938", "2026-09-15")).resolves.toBe(false);

      // The fail-open above must not translate into a duplicate row: with
      // the day-uniqueness constraint in place, a retried append() for the
      // same listing/day gets a 409 back from PostgREST — treated as
      // success (idempotent no-op), not a fabricated second insert.
      const appendFetchMock = buildFetchMock({
        ...resolvedListingRoutes,
        pricesPost: jsonResponse({ message: "duplicate key" }, { ok: false, status: 409 }),
      });
      vi.stubGlobal("fetch", appendFetchMock);
      await expect(store.append(record())).resolves.toBeUndefined();
    });
  });

  describe("append", () => {
    it("inserts a price row with the ignore-duplicates Prefer header", async () => {
      const fetchMock = buildFetchMock({
        ...resolvedListingRoutes,
        pricesPost: jsonResponse([], { status: 201 }),
      });
      vi.stubGlobal("fetch", fetchMock);
      const store = new SupabasePriceStore(SUPABASE_URL, SERVICE_ROLE_KEY);

      await expect(store.append(record())).resolves.toBeUndefined();

      const postCall = fetchMock.mock.calls.find(
        ([url, options]) => url.includes("/rest/v1/prices") && options?.method === "POST",
      );
      expect(postCall).toBeDefined();
      const headers = postCall?.[1]?.headers as Record<string, string>;
      expect(headers.prefer).toContain("resolution=ignore-duplicates");
    });

    it("treats a 409 (duplicate day-uniqueness conflict) as success, not an error", async () => {
      const fetchMock = buildFetchMock({
        ...resolvedListingRoutes,
        pricesPost: jsonResponse({ message: "duplicate key" }, { ok: false, status: 409 }),
      });
      vi.stubGlobal("fetch", fetchMock);
      const store = new SupabasePriceStore(SUPABASE_URL, SERVICE_ROLE_KEY);

      await expect(store.append(record())).resolves.toBeUndefined();
    });

    it("rejects a real Supabase insert error (non-409) instead of swallowing it", async () => {
      const fetchMock = buildFetchMock({
        ...resolvedListingRoutes,
        pricesPost: jsonResponse({ message: "server error" }, { ok: false, status: 500 }),
      });
      vi.stubGlobal("fetch", fetchMock);
      const store = new SupabasePriceStore(SUPABASE_URL, SERVICE_ROLE_KEY);

      await expect(store.append(record())).rejects.toThrow(/Supabase insert failed/);
    });

    it("rejects a null price without making any network call", async () => {
      const fetchMock = buildFetchMock(resolvedListingRoutes);
      vi.stubGlobal("fetch", fetchMock);
      const store = new SupabasePriceStore(SUPABASE_URL, SERVICE_ROLE_KEY);

      // @ts-expect-error — exercising a bad upstream value at the runtime boundary
      await expect(store.append(record({ price: null }))).rejects.toThrow(/non-positive price/);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("rejects a zero/negative price without making any network call", async () => {
      const fetchMock = buildFetchMock(resolvedListingRoutes);
      vi.stubGlobal("fetch", fetchMock);
      const store = new SupabasePriceStore(SUPABASE_URL, SERVICE_ROLE_KEY);

      await expect(store.append(record({ price: 0 }))).rejects.toThrow(/non-positive price/);
      await expect(store.append(record({ price: -5 }))).rejects.toThrow(/non-positive price/);
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });
});
