import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parseDealNewsFeed } from "./dealnews";
import { parseSlickdealsFeed } from "./slickdeals";
import { dedupeDealFeedItems } from "./dedupe";

const FIXTURES_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "../fixtures");

function loadFixture(name: string): string {
  return readFileSync(path.join(FIXTURES_DIR, name), "utf8");
}

describe("parseDealNewsFeed", () => {
  const items = parseDealNewsFeed(loadFixture("dealnews-sample.xml"));

  it("maps a fully-specified item to the DealFeedItem shape", () => {
    const item = items[0];
    expect(item).toMatchObject({
      source: "dealnews",
      title: "Samsung 990 Pro 2TB NVMe SSD for $129.00 + free shipping",
      url: "https://www.dealnews.com/Samsung-990-Pro-2-TB-NVMe-SSD-for-129-00-free-shipping/21999999.html?iref=rss",
      storeSlug: "best_buy",
      price: 129,
      discountPercent: 14,
      creatorAttributionUrl: null,
      postedAt: "2026-09-16T01:19:07.000Z",
    });
    expect(item?.id).toMatch(/^dealnews-[0-9a-f]{12}$/);
    expect(item?.dedupeKey).toBe(`dealnews:${item?.id.replace("dealnews-", "")}`);
  });

  it("leaves price and storeSlug null rather than guessing when unparseable", () => {
    const item = items[1];
    expect(item).toMatchObject({
      title: "Mystery Gift Card Bundle at ShopSomewhere",
      storeSlug: null,
      price: null,
      discountPercent: null,
    });
  });

  it("preserves the link exactly, including its referral query param", () => {
    expect(items[0]?.url.endsWith("?iref=rss")).toBe(true);
  });

  it("coerces an all-digit title/description instead of dropping the item or the feed", () => {
    // fast-xml-parser parses an all-digit text node as a number, not a
    // string — this proves the item survives (coerced), not just that the
    // rest of the feed does.
    expect(items).toHaveLength(3);
    const item = items[2];
    expect(item).toMatchObject({ title: "123456" });
  });
});

describe("parseSlickdealsFeed", () => {
  const items = parseSlickdealsFeed(loadFixture("slickdeals-sample.xml"));

  it("parses price from the title and attributes the original poster", () => {
    const item = items[0];
    expect(item).toMatchObject({
      source: "slickdeals",
      title: "Sony WH-1000XM5 Wireless Noise-Canceling Headphones $328",
      storeSlug: "amazon",
      price: 328,
      discountPercent: 18,
      creatorAttributionUrl: "https://slickdeals.net/u/quietcommute",
    });
  });

  it("returns null price when the title has no dollar figure", () => {
    const item = items[1];
    expect(item).toMatchObject({
      title: "Free digital coupon for a bag of chips at a local grocer",
      storeSlug: null,
      price: null,
      discountPercent: null,
      creatorAttributionUrl: null,
    });
  });

  it("coerces an all-digit title/description instead of dropping the item or the feed", () => {
    expect(items).toHaveLength(3);
    const item = items[2];
    expect(item).toMatchObject({ title: "123456" });
  });
});

describe("dedupeDealFeedItems", () => {
  it("keeps only the first occurrence of a repeated id", () => {
    const [first, second] = parseDealNewsFeed(loadFixture("dealnews-sample.xml"));
    const deduped = dedupeDealFeedItems([first!, first!, second!]);
    expect(deduped).toHaveLength(2);
  });
});
