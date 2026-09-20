import { writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { DealFeedItem } from "@coupon-app/shared";
import { dedupeDealFeedItems } from "./dedupe";
import { fetchDealNewsFeed } from "./dealnews";
import { fetchSlickdealsFeed } from "./slickdeals";
import { fetchWootFeed } from "./woot";

const OUTPUT_PATH = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../packages/shared/src/deals-live.json",
);

async function fetchSource(
  name: string,
  fetcher: () => Promise<DealFeedItem[]>,
): Promise<DealFeedItem[]> {
  try {
    const items = await fetcher();
    console.log(`[ingest] ${name}: fetched ${items.length} deal(s)`);
    return items;
  } catch (error) {
    console.warn(`[ingest] ${name} unreachable — skipping it this run.`, error);
    return [];
  }
}

async function main() {
  const [dealNews, slickdeals, woot] = await Promise.all([
    fetchSource("DealNews", fetchDealNewsFeed),
    fetchSource("Slickdeals", fetchSlickdealsFeed),
    fetchSource("Woot", () => fetchWootFeed(process.env.WOOT_API_KEY)),
  ]);

  if (!process.env.WOOT_API_KEY) {
    console.log("[ingest] Woot: no WOOT_API_KEY set — skipped (optional source).");
  }

  const combined = dedupeDealFeedItems([...dealNews, ...slickdeals, ...woot]).sort(
    (a, b) => new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime(),
  );

  if (combined.length === 0) {
    console.warn(
      "[ingest] No live deals fetched from any source this run — leaving deals-live.json as-is " +
        "(the app's fixtures fallback keeps serving if it was never written).",
    );
    return;
  }

  writeFileSync(OUTPUT_PATH, `${JSON.stringify(combined, null, 2)}\n`, "utf8");
  console.log(`[ingest] Wrote ${combined.length} deduped deal(s) to ${OUTPUT_PATH}`);
}

main().catch((error) => {
  console.error("[ingest] Unexpected failure — fixtures fallback stays in place.", error);
  process.exitCode = 1;
});
