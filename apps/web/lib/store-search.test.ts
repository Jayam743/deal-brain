import type { Product } from "@coupon-app/shared";
import { describe, expect, it } from "vitest";
import { buildStoreProductLink } from "./store-search";

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: "prod-test",
    title: "GeForce RTX 4070 Super 12GB",
    brand: "NVIDIA",
    category: "Components",
    imageUrl: null,
    upc: null,
    gtin: null,
    asin: null,
    wpid: null,
    sku: null,
    ...overrides,
  };
}

describe("buildStoreProductLink", () => {
  it("links to the exact Amazon product page when an ASIN is present", () => {
    const product = makeProduct({ asin: "B0CV1WV1JN" });
    expect(buildStoreProductLink(product, "amazon")).toEqual({
      label: "Open Amazon",
      href: "https://www.amazon.com/dp/B0CV1WV1JN",
    });
  });

  it("links to the exact Best Buy product page when a SKU is present", () => {
    const product = makeProduct({ sku: "6567938" });
    expect(buildStoreProductLink(product, "best_buy")).toEqual({
      label: "Open Best Buy",
      href: "https://www.bestbuy.com/site/-/6567938.p?skuId=6567938",
    });
  });

  it("links to the exact Walmart product page when a WPID is present", () => {
    const product = makeProduct({ wpid: "5044821" });
    expect(buildStoreProductLink(product, "walmart")).toEqual({
      label: "Open Walmart",
      href: "https://www.walmart.com/ip/5044821",
    });
  });

  it("falls back to a store search when the store's identifier is missing", () => {
    const product = makeProduct();
    expect(buildStoreProductLink(product, "amazon")).toEqual({
      label: "Search at Amazon",
      href: `https://www.amazon.com/s?k=${encodeURIComponent(product.title)}`,
    });
  });

  it("falls back to a store search when the store's identifier is an empty string", () => {
    const product = makeProduct({ asin: "" });
    expect(buildStoreProductLink(product, "amazon")).toEqual({
      label: "Search at Amazon",
      href: `https://www.amazon.com/s?k=${encodeURIComponent(product.title)}`,
    });
  });

  it("falls back to search for Micro Center, which has no stable public identifier", () => {
    const product = makeProduct({ asin: "B0CV1WV1JN", sku: "6567938", wpid: "5044821" });
    expect(buildStoreProductLink(product, "micro_center")).toEqual({
      label: "Search at Micro Center",
      href: `https://www.microcenter.com/search/search_results.aspx?Ntt=${encodeURIComponent(product.title)}`,
    });
  });

  it("falls back to a plain web search when no store is known at all", () => {
    const product = makeProduct({ asin: "B0CV1WV1JN" });
    expect(buildStoreProductLink(product, null)).toEqual({
      label: "Search the web",
      href: `https://www.google.com/search?q=${encodeURIComponent(product.title)}`,
    });
  });
});
