import {
  computeVerdict,
  currentPrices,
  dealFeedItems,
  priceHistories,
  products,
  stores,
  type Product,
} from "@coupon-app/shared";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftIcon, ExternalLinkIcon } from "@/components/nav-icons";
import { Sparkline } from "@/components/sparkline";
import { VerdictBadge } from "@/components/verdict-badge";
import { SOURCE_LABEL } from "@/lib/deal-source";
import { formatMoney, formatRelativeTime } from "@/lib/format";
import { buildStoreSearchLink } from "@/lib/store-search";

/**
 * A deal isn't linked to a tracked product record, so price context is
 * matched by title overlap — an honest best-effort, not a fabricated link.
 * Below the ~60% word-overlap threshold we show the "not tracked" state
 * instead of guessing.
 */
function findMatchingProduct(dealTitle: string): Product | undefined {
  const normalized = dealTitle.toLowerCase();
  return products.find((product) => {
    const words = product.title
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((word) => word.length > 2);
    if (words.length === 0) return false;
    const matched = words.filter((word) => normalized.includes(word)).length;
    return matched / words.length >= 0.6;
  });
}

export function generateStaticParams() {
  return dealFeedItems.map((deal) => ({ id: deal.id }));
}

export default async function DealDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const deal = dealFeedItems.find((d) => d.id === id);
  if (!deal) notFound();

  const store = deal.storeSlug ? stores.find((s) => s.slug === deal.storeSlug) : undefined;
  const searchLink = buildStoreSearchLink(deal.title, deal.storeSlug);
  const product = findMatchingProduct(deal.title);
  const history = product ? (priceHistories[product.id] ?? []) : [];
  const verdict =
    product && history.length > 0
      ? computeVerdict(deal.price ?? currentPrices[product.id] ?? 0, history)
      : null;

  return (
    <div>
      <Link
        href="/deals"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-[color:var(--color-text-muted)] transition-colors hover:text-[color:var(--color-text)]"
      >
        <ArrowLeftIcon className="h-4 w-4" />
        Back to deals
      </Link>

      <div className="surface-panel px-7 py-8">
        <div className="flex flex-wrap items-center gap-1.5 text-xs text-[color:var(--color-text-muted)]">
          <span
            className="rounded-full px-2 py-0.5"
            style={{ background: "var(--color-surface-raised)" }}
          >
            {SOURCE_LABEL[deal.source]}
          </span>
          {store ? (
            <span
              className="rounded-full px-2 py-0.5"
              style={{ background: "var(--color-surface-raised)" }}
            >
              {store.name}
            </span>
          ) : null}
          <span>posted {formatRelativeTime(deal.postedAt)}</span>
        </div>

        <h1 className="font-display mt-3 max-w-2xl text-2xl leading-snug tracking-tight sm:text-3xl">
          {deal.title}
        </h1>

        <div className="mt-6 flex flex-wrap items-end gap-6">
          {deal.price !== null ? (
            <div>
              <div className="tabular font-mono text-3xl font-semibold">
                {formatMoney(deal.price)}
              </div>
              {deal.discountPercent !== null ? (
                <div
                  className="mt-1 text-sm font-medium"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  −{deal.discountPercent}%
                </div>
              ) : null}
            </div>
          ) : null}

          <a
            href={searchLink.href}
            target="_blank"
            rel="noopener"
            className="hover-lift inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium"
            style={{ background: "var(--color-accent)", color: "var(--color-surface)" }}
          >
            {searchLink.label}
            <ExternalLinkIcon className="h-4 w-4" />
          </a>
        </div>

        {deal.creatorAttributionUrl ? (
          <a
            href={deal.creatorAttributionUrl}
            target="_blank"
            rel="noopener"
            className="mt-4 inline-block text-xs text-[color:var(--color-text-muted)] underline decoration-dotted"
          >
            via original poster
          </a>
        ) : null}
      </div>

      <section className="surface-panel mt-6 px-7 py-7">
        <h2 className="text-sm font-semibold">Price context</h2>
        {verdict ? (
          <div className="mt-4 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <VerdictBadge verdict={verdict} size="lg" />
            {history.length > 1 ? (
              <Sparkline
                data={history.map((h) => h.price)}
                width={160}
                height={48}
                area
                showRange
                rangeUnit="currency"
              />
            ) : null}
          </div>
        ) : (
          <div className="mt-3 flex items-center gap-2 text-sm text-[color:var(--color-text-muted)]">
            <span
              className="h-1.5 w-1.5 shrink-0 rounded-full"
              style={{ background: "var(--color-caution)" }}
            />
            not in your tracked price history yet — add it to your wishlist to start measuring.
          </div>
        )}
      </section>
    </div>
  );
}
