import { XMLParser } from "fast-xml-parser";
import type { DealFeedItem } from "@coupon-app/shared";
import { ingestUserAgent } from "./user-agent";
import { detectStoreSlug } from "./store-detect";
import { stableDealId } from "./hash";
import { parseDiscountPercentFromText, parsePriceFromText, stripHtml } from "./text";

/** Slickdeals' frontpage/popular deals RSS feed — no key required. */
export const SLICKDEALS_RSS_URL = "https://slickdeals.net/newsearch.php?rss=1&mode=frontpage";

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });

interface SlickdealsRawItem {
  title?: string;
  link?: string;
  description?: string;
  pubDate?: string;
  "dc:creator"?: string;
}

function toArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

function toPostedAt(pubDate: string | undefined): string {
  const parsed = pubDate ? new Date(pubDate) : null;
  return parsed && !Number.isNaN(parsed.getTime())
    ? parsed.toISOString()
    : new Date().toISOString();
}

/** Maps a parsed Slickdeals RSS document to `DealFeedItem[]`. Slickdeals has
 * no structured price/store fields in RSS, so both are best-effort parsed
 * from the title/description text — falling back to null rather than
 * guessing when nothing matches. */
export function parseSlickdealsFeed(xml: string): DealFeedItem[] {
  const parsed = parser.parse(xml) as {
    rss?: { channel?: { item?: SlickdealsRawItem | SlickdealsRawItem[] } };
  };
  const items = toArray(parsed.rss?.channel?.item);

  return items
    .filter((item): item is SlickdealsRawItem & { title: string; link: string } =>
      Boolean(item.title && item.link),
    )
    .flatMap((item) => {
      // fast-xml-parser coerces all-digit text nodes (e.g. a title/description
      // that's just numbers) to `number`, not `string`. Coerce back before any
      // string op, and skip just this item — not the whole feed — if it still
      // fails somehow.
      try {
        const { id, dedupeKey } = stableDealId("slickdeals", item.link);
        const title = String(item.title).trim();
        const rawDescription = item.description ? String(item.description) : "";
        const description = rawDescription ? stripHtml(rawDescription) : "";
        const haystack = `${title} ${description}`;
        return [
          {
            id,
            source: "slickdeals",
            dedupeKey,
            title,
            url: item.link,
            storeSlug: detectStoreSlug(haystack),
            price: parsePriceFromText(title),
            discountPercent: parseDiscountPercentFromText(haystack),
            creatorAttributionUrl: item["dc:creator"]
              ? `https://slickdeals.net/u/${encodeURIComponent(item["dc:creator"])}`
              : null,
            postedAt: toPostedAt(item.pubDate),
          } satisfies DealFeedItem,
        ];
      } catch (error) {
        console.warn("[ingest] Slickdeals item failed to parse — skipping it.", error);
        return [];
      }
    });
}

const MAX_RESPONSE_BYTES = 10 * 1024 * 1024;

export async function fetchSlickdealsFeed(): Promise<DealFeedItem[]> {
  const response = await fetch(SLICKDEALS_RSS_URL, {
    headers: { "user-agent": ingestUserAgent },
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) {
    throw new Error(`Slickdeals RSS responded ${response.status}`);
  }
  const contentLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > MAX_RESPONSE_BYTES) {
    throw new Error(`Slickdeals RSS response too large (${contentLength} bytes)`);
  }
  return parseSlickdealsFeed(await response.text());
}
