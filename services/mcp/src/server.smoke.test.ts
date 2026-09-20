import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createServer } from "./server.js";

/**
 * Smoke test: connects a real MCP client to the real server over an
 * in-memory transport pair (no stdio needed for the test itself), lists
 * tools, and calls each one — asserting the JSON payloads carry real
 * `@coupon-app/shared` data, not stubs.
 */
describe("deal-brain MCP server", () => {
  let client: Client;

  beforeEach(async () => {
    const server = createServer();
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    client = new Client({ name: "smoke-test-client", version: "0.0.0" });
    await Promise.all([client.connect(clientTransport), server.connect(serverTransport)]);
  });

  afterEach(async () => {
    await client.close();
  });

  it("lists all four read-only tools", async () => {
    const { tools } = await client.listTools();
    const names = tools.map((t) => t.name).sort();
    expect(names).toEqual(["check_price", "get_product_context", "list_wishlist", "search_deals"]);
  });

  it("list_wishlist returns real wishlist verdicts", async () => {
    const result = await client.callTool({ name: "list_wishlist", arguments: {} });
    const text = (result.content as Array<{ type: string; text: string }>)[0]?.text ?? "{}";
    const payload = JSON.parse(text);

    expect(payload.dataSource).toBe("sample-fixture");
    expect(Array.isArray(payload.items)).toBe(true);
    expect(payload.items.length).toBeGreaterThan(0);
    expect(payload.items[0]).toHaveProperty("product.title");
    expect(payload.items[0]).toHaveProperty("verdict.confidenceLabel");
  });

  it("get_product_context finds a known product and never fabricates a verdict", async () => {
    const result = await client.callTool({
      name: "get_product_context",
      arguments: { query: "RTX 4070" },
    });
    const text = (result.content as Array<{ type: string; text: string }>)[0]?.text ?? "{}";
    const payload = JSON.parse(text);

    expect(payload.found).toBe(true);
    expect(payload.product.title).toContain("4070");
    expect(payload.verdict).toHaveProperty("status");
    expect(payload.coupons).toHaveProperty("productSpecific");
    expect(payload.coupons).toHaveProperty("storewide");
  });

  it("get_product_context is honest about an unmatched item", async () => {
    const result = await client.callTool({
      name: "get_product_context",
      arguments: { query: "definitely not a real product" },
    });
    const text = (result.content as Array<{ type: string; text: string }>)[0]?.text ?? "{}";
    const payload = JSON.parse(text);

    expect(payload.found).toBe(false);
  });

  it("search_deals returns deal-feed items with a data-source label", async () => {
    // Empty query = full feed pass-through, so this stays deterministic whether
    // `deals-live.json` (real ingested data) or the sample fixtures are active.
    const result = await client.callTool({ name: "search_deals", arguments: { query: "" } });
    const text = (result.content as Array<{ type: string; text: string }>)[0]?.text ?? "{}";
    const payload = JSON.parse(text);

    expect(["live-ingested", "sample-fixture"]).toContain(payload.dataSource);
    expect(Array.isArray(payload.matches)).toBe(true);
    expect(payload.matches.length).toBeGreaterThan(0);
    expect(payload.matches[0]).toHaveProperty("title");
  });

  it("check_price gives a real verdict for a tracked-store match with enough history", async () => {
    const result = await client.callTool({
      name: "check_price",
      arguments: { item: "RTX 4070 Super", price: 520, store: "Best Buy" },
    });
    const text = (result.content as Array<{ type: string; text: string }>)[0]?.text ?? "{}";
    const payload = JSON.parse(text);

    expect(payload.resultType).toBe("verdict");
    expect(payload.matchedProduct.title).toContain("4070");
    expect(payload.trustCaveat).toBeUndefined();
  });

  it("check_price is honest context (not a verdict) for an untracked store", async () => {
    const result = await client.callTool({
      name: "check_price",
      arguments: { item: "RTX 4070 Super", price: 520, store: "Amazon" },
    });
    const text = (result.content as Array<{ type: string; text: string }>)[0]?.text ?? "{}";
    const payload = JSON.parse(text);

    expect(payload.resultType).toBe("context");
    expect(payload.trustCaveat).toBeTruthy();
  });

  it("check_price is honest context for a completely unmatched item", async () => {
    const result = await client.callTool({
      name: "check_price",
      arguments: { item: "a made-up gadget", price: 10, store: "Best Buy" },
    });
    const text = (result.content as Array<{ type: string; text: string }>)[0]?.text ?? "{}";
    const payload = JSON.parse(text);

    expect(payload.resultType).toBe("context");
    expect(payload.matchedProduct).toBeNull();
    expect(payload.sourcesUsed).toEqual([]);
  });
});
