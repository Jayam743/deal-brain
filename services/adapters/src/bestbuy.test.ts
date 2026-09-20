import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getStoreAvailability,
  isBestBuyConfigured,
  lookupProductBySku,
  mapBestBuyProduct,
  searchProducts,
} from "./bestbuy";

const FIXTURES_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "../fixtures");

function loadFixture(name: string): unknown {
  return JSON.parse(readFileSync(path.join(FIXTURES_DIR, name), "utf8"));
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("isBestBuyConfigured", () => {
  it("is false with no key and true with one", () => {
    expect(isBestBuyConfigured(undefined)).toBe(false);
    expect(isBestBuyConfigured("some-key")).toBe(true);
  });
});

describe("mapBestBuyProduct", () => {
  it("maps a raw Best Buy product to the shared catalog + price shape", () => {
    const raw = (loadFixture("bestbuy-product-sku-sample.json") as { products: unknown[] })
      .products[0] as Parameters<typeof mapBestBuyProduct>[0];

    const match = mapBestBuyProduct(raw, "2026-09-15T09:00:00.000Z");

    expect(match).toEqual({
      product: {
        title: "NVIDIA - GeForce RTX 4070 SUPER 12GB GDDR6X Graphics Card",
        brand: "NVIDIA",
        imageUrl:
          "https://pisces.bbystatic.com/image2/BestBuy_US/images/products/6567/6567938_sd.jpg",
        upc: "812674024451",
        sku: "6567938",
        category: "Graphics Cards",
      },
      price: {
        sku: "6567938",
        price: 549.99,
        currency: "USD",
        wasPrice: 599.99,
        capturedAt: "2026-09-15T09:00:00.000Z",
      },
    });
  });

  it("leaves wasPrice null when the item isn't on sale", () => {
    const raw = (loadFixture("bestbuy-product-search-sample.json") as { products: unknown[] })
      .products[1] as Parameters<typeof mapBestBuyProduct>[0];

    const match = mapBestBuyProduct(raw);
    expect(match?.price.wasPrice).toBeNull();
    expect(match?.product.upc).toBeNull();
  });

  it("falls back to a non-null category when Best Buy doesn't supply class/department", () => {
    const match = mapBestBuyProduct({ sku: 1, name: "Mystery item", salePrice: 9.99 });
    expect(match?.product.category).toBe("Uncategorized");
  });

  it("returns null instead of fabricating a $0 price when both prices are missing", () => {
    const match = mapBestBuyProduct({ sku: 1, name: "No price item" });
    expect(match).toBeNull();
  });

  it("returns null when sku is missing (never stringifies to \"undefined\")", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const match = mapBestBuyProduct({ sku: undefined as any, name: "No sku item", salePrice: 9.99 });
    expect(match).toBeNull();
  });
});

describe("lookupProductBySku", () => {
  it("returns not_configured with no api key — no fetch call is made", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const result = await lookupProductBySku("6567938", undefined);

    expect(result).toEqual({ ok: false, reason: "not_configured" });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("maps a mocked fetch response to the shared shape", async () => {
    const payload = loadFixture("bestbuy-product-sku-sample.json");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => payload }));

    const result = await lookupProductBySku("6567938", "test-key");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.product.sku).toBe("6567938");
      expect(result.data.price.price).toBe(549.99);
    }
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/products(sku=6567938)"),
      expect.anything(),
    );
  });

  it("returns invalid_data (not a fabricated $0) when the matched product has no price", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ products: [{ sku: 6567938, name: "No price on file" }] }),
      }),
    );

    const result = await lookupProductBySku("6567938", "test-key");
    expect(result).toEqual({ ok: false, reason: "invalid_data" });
  });

  it("returns not_found when Best Buy has no product for that sku", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ products: [] }) }),
    );

    const result = await lookupProductBySku("0000000", "test-key");
    expect(result).toEqual({ ok: false, reason: "not_found" });
  });

  it("returns http_error on a non-2xx response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 403 }));

    const result = await lookupProductBySku("6567938", "bad-key");
    expect(result).toEqual({ ok: false, reason: "http_error", status: 403 });
  });

  it("returns network_error when fetch throws", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("boom")));

    const result = await lookupProductBySku("6567938", "test-key");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("network_error");
  });
});

describe("searchProducts", () => {
  it("returns not_configured with no api key", async () => {
    const result = await searchProducts("rtx 4070", undefined);
    expect(result).toEqual({ ok: false, reason: "not_configured" });
  });

  it("maps every product in a mocked search response", async () => {
    const payload = loadFixture("bestbuy-product-search-sample.json");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => payload }));

    const result = await searchProducts("rtx 4070", "test-key");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toHaveLength(2);
      expect(result.data.map((m) => m.product.sku)).toEqual(["6567938", "6524729"]);
    }
  });
});

describe("getStoreAvailability", () => {
  it("returns not_configured with no api key", async () => {
    const result = await getStoreAvailability("6567938", "01701", undefined);
    expect(result).toEqual({ ok: false, reason: "not_configured" });
  });

  it("maps a mocked stores.json response to store availability entries", async () => {
    const payload = loadFixture("bestbuy-stores-sample.json");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => payload }));

    const result = await getStoreAvailability("6567938", "01701", "test-key");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toEqual([
        {
          storeId: "1029",
          name: "Framingham",
          city: "Framingham",
          region: "MA",
          postalCode: "01701",
          distanceMiles: 4.52,
          inStock: true,
        },
        {
          storeId: "611",
          name: "Boston-Downtown Crossing",
          city: "Boston",
          region: "MA",
          postalCode: "02108",
          distanceMiles: 9.87,
          inStock: true,
        },
      ]);
    }
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("area(01701,25)"),
      expect.anything(),
    );
  });
});
