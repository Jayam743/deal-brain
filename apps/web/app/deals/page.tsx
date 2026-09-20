import { dealFeedItems, isLiveDealFeed, stores } from "@coupon-app/shared";
import { DealsExplorer } from "@/components/deals-explorer";
import { PageHeader } from "@/components/page-header";

export default function DealsPage() {
  return (
    <div>
      <PageHeader
        title="Deals"
        description={
          isLiveDealFeed
            ? "Live deals from DealNews and Slickdeals RSS, deduplicated. Creator attribution is never overwritten with our own — price verdicts on each deal are still sample data."
            : "Structured feed parsing, not scraping — Woot's API and DealNews/Slickdeals RSS, deduplicated. Creator attribution is never overwritten with our own. (Live feed unreachable right now — showing sample fixture deals.)"
        }
      />

      <DealsExplorer deals={dealFeedItems} stores={stores} />
    </div>
  );
}
