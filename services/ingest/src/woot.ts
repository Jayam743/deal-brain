import type { DealFeedItem } from "@coupon-app/shared";
import { detectStoreSlug } from "./store-detect";
import { stableDealId } from "./hash";

/** Woot's official Developer Feed API — requires a free-tier key (unlike
 * DealNews/Slickdeals RSS), so this whole source is gated behind an
 * optional `WOOT_API_KEY` env var and is skipped cleanly without one. */
const WOOT_FEED_URL = "https://developer.woot.com/feed/All";

interface WootOffer {
  Id?: string;
  Title?: string;
  FullTitle?: string;
  Url?: string;
}

function toItems(payload: unknown): WootOffer[] {
  if (Array.isArray(payload)) return payload as WootOffer[];
  if (
    payload &&
    typeof payload === "object" &&
    Array.isArray((payload as { Items?: unknown }).Items)
  ) {
    return (payload as { Items: WootOffer[] }).Items;
  }
  return [];
}

/**
 * Fetches Woot's feed when a key is supplied. Price is intentionally left
 * null here — this repo hasn't verified the authenticated response's price
 * field shape against a real key, and an unverified guess would risk
 * fabricating a price. Wire that in once a key is available to test against.
 */
export async function fetchWootFeed(apiKey: string | undefined): Promise<DealFeedItem[]> {
  if (!apiKey) return [];

  try {
    const response = await fetch(WOOT_FEED_URL, {
      headers: { "x-api-key": apiKey, accept: "application/json" },
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) {
      console.warn(`[ingest] Woot API responded ${response.status} — skipping Woot.`);
      return [];
    }

    const offers = toItems(await response.json());
    return offers
      .filter((offer): offer is WootOffer & { Url: string } =>
        Boolean(offer.Url && (offer.Title || offer.FullTitle)),
      )
      .map((offer) => {
        const { id, dedupeKey } = stableDealId("woot", offer.Url);
        const title = (offer.FullTitle ?? offer.Title ?? "").trim();
        return {
          id,
          source: "woot",
          dedupeKey,
          title,
          url: offer.Url,
          storeSlug: detectStoreSlug(title),
          price: null,
          discountPercent: null,
          creatorAttributionUrl: null,
          postedAt: new Date().toISOString(),
        } satisfies DealFeedItem;
      });
  } catch (error) {
    console.warn("[ingest] Woot fetch failed — skipping Woot.", error);
    return [];
  }
}
