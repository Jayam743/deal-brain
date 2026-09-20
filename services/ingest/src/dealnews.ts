import { XMLParser } from "fast-xml-parser";
import type { DealFeedItem } from "@coupon-app/shared";
import { ingestUserAgent } from "./user-agent";
import { detectStoreSlug } from "./store-detect";
import { stableDealId } from "./hash";
import { parseDiscountPercentFromText, stripHtml } from "./text";

/** DealNews' documented RSS feed, sorted newest-first (see dealnews.com/pages/rss.html). */
export const DEALNEWS_RSS_URL = "https://www.dealnews.com/?rss=1&sort=time";

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });

interface DealNewsPrice {
  "#text": number;
  "@_currency"?: string;
}

interface DealNewsRawItem {
  title?: string;
  link?: string;
  description?: string;
  pubDate?: string;
  "dealnews:retailer"?: string;
  "dealnews:price"?: DealNewsPrice | number;
}

function toArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

function parsePrice(raw: DealNewsRawItem["dealnews:price"]): number | null {
  if (raw === undefined || raw === null) return null;
  const value = typeof raw === "number" ? raw : Number(raw["#text"]);
  return Number.isFinite(value) ? value : null;
}

function toPostedAt(pubDate: string | undefined): string {
  const parsed = pubDate ? new Date(pubDate) : null;
  return parsed && !Number.isNaN(parsed.getTime())
    ? parsed.toISOString()
    : new Date().toISOString();
}

/** Maps a parsed DealNews RSS document to `DealFeedItem[]`. DealNews forbids
 * stripping/altering links or referral codes and requires attribution, so
 * `url` is passed through untouched and `creatorAttributionUrl` is left
 * null (DealNews deals are editorial, not creator-posted). */
export function parseDealNewsFeed(xml: string): DealFeedItem[] {
  const parsed = parser.parse(xml) as {
    rss?: { channel?: { item?: DealNewsRawItem | DealNewsRawItem[] } };
  };
  const items = toArray(parsed.rss?.channel?.item);

  return items
    .filter((item): item is DealNewsRawItem & { title: string; link: string } =>
      Boolean(item.title && item.link),
    )
    .flatMap((item) => {
      // fast-xml-parser coerces all-digit text nodes (e.g. a title/description
      // that's just numbers) to `number`, not `string`. Coerce back before any
      // string op, and skip just this item — not the whole feed — if it still
      // fails somehow.
      try {
        const { id, dedupeKey } = stableDealId("dealnews", item.link);
        const rawDescription = item.description ? String(item.description) : "";
        const description = rawDescription ? stripHtml(rawDescription) : "";
        return [
          {
            id,
            source: "dealnews",
            dedupeKey,
            title: String(item.title).trim(),
            url: item.link,
            storeSlug: detectStoreSlug(item["dealnews:retailer"]),
            price: parsePrice(item["dealnews:price"]),
            discountPercent: parseDiscountPercentFromText(description),
            creatorAttributionUrl: null,
            postedAt: toPostedAt(item.pubDate),
          } satisfies DealFeedItem,
        ];
      } catch (error) {
        console.warn("[ingest] DealNews item failed to parse — skipping it.", error);
        return [];
      }
    });
}

const MAX_RESPONSE_BYTES = 10 * 1024 * 1024;

export async function fetchDealNewsFeed(): Promise<DealFeedItem[]> {
  const response = await fetch(DEALNEWS_RSS_URL, {
    headers: { "user-agent": ingestUserAgent },
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) {
    throw new Error(`DealNews RSS responded ${response.status}`);
  }
  const contentLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > MAX_RESPONSE_BYTES) {
    throw new Error(`DealNews RSS response too large (${contentLength} bytes)`);
  }
  return parseDealNewsFeed(await response.text());
}
