/**
 * The Deal Brain MCP server (F11′): a read-only bridge exposing wishlist
 * verdicts, product context, deal-feed search, and the F10 on-demand price
 * check to a Claude Code session. No writes, no secrets, no side effects —
 * every tool call reads `@coupon-app/shared` fixtures/live data in-process.
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { buildProductContext, buildWishlistPayload, checkPrice, searchDeals } from "./deal-data.js";

function jsonResult(payload: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(payload, null, 2) }],
  };
}

export function createServer(): McpServer {
  const server = new McpServer({ name: "deal-brain", version: "0.1.0" });

  server.registerTool(
    "list_wishlist",
    {
      title: "List wishlist",
      description:
        "Lists tracked wishlist items with their honest verdicts (percentile vs. own price history, " +
        "confidence, last-checked timestamp). Never fabricates a verdict before enough history exists.",
    },
    () => jsonResult(buildWishlistPayload()),
  );

  server.registerTool(
    "get_product_context",
    {
      title: "Get product context",
      description:
        "Looks up a product by id or free-text query and returns its current price, a price-history " +
        "summary, an honest verdict (never fabricated), matching verified coupons, and the store roster.",
      inputSchema: {
        query: z.string().optional().describe("Free-text match against title/brand/UPC/ASIN/SKU/etc."),
        id: z.string().optional().describe("Exact product id, if known."),
      },
    },
    ({ query, id }) => {
      if (!query && !id) {
        return {
          isError: true,
          content: [{ type: "text" as const, text: "Provide either `query` or `id`." }],
        };
      }
      return jsonResult(buildProductContext(query, id));
    },
  );

  server.registerTool(
    "search_deals",
    {
      title: "Search live deals",
      description:
        "Searches the deal feed (Woot/DealNews/Slickdeals) for matching titles. Reports whether results " +
        "are live-ingested or the Phase 1 sample fallback.",
      inputSchema: {
        query: z.string().describe("Text to match against deal titles."),
      },
    },
    ({ query }) => jsonResult(searchDeals(query)),
  );

  server.registerTool(
    "check_price",
    {
      title: "Check a price (F10 on-demand context check)",
      description:
        "Given an item, a price you found, and a store, returns a confidence-scored result: a real " +
        "verdict only when the item resolves to tracked (Best Buy/Walmart) history, otherwise an honest " +
        '"context, not a live check of your exact item" result. Never fabricates a verdict.',
      inputSchema: {
        item: z.string().describe("What you found — free-text product name, UPC, ASIN, or SKU."),
        price: z.number().describe("The price you found it at."),
        store: z.string().describe("The store — e.g. Best Buy, Walmart, Amazon, Micro Center."),
      },
    },
    ({ item, price, store }) => jsonResult(checkPrice({ item, price, store })),
  );

  return server;
}
