import type { DealFeedItem, StoreRetailer } from "@coupon-app/shared";
import Link from "next/link";
import { SOURCE_LABEL } from "@/lib/deal-source";
import { formatMoney, formatRelativeTime } from "@/lib/format";
import { ArrowLeftIcon } from "./nav-icons";

export function DealCard({ deal, store }: { deal: DealFeedItem; store?: StoreRetailer }) {
  return (
    <Link
      href={`/deals/${deal.id}`}
      className="surface-card hover-lift group flex flex-col gap-3 px-5 py-4"
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-sm font-medium leading-snug">{deal.title}</h3>
        {deal.price !== null ? (
          <span className="tabular shrink-0 font-mono text-base font-semibold">
            {formatMoney(deal.price)}
          </span>
        ) : null}
      </div>

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
        {deal.discountPercent !== null ? (
          <span
            className="rounded-full px-2 py-0.5"
            style={{ background: "var(--color-surface-raised)", color: "var(--color-text-muted)" }}
          >
            −{deal.discountPercent}%
          </span>
        ) : null}
        <span>posted {formatRelativeTime(deal.postedAt)}</span>
      </div>

      <div className="mt-1 flex items-center gap-1.5 text-sm font-medium text-[color:var(--color-accent)]">
        View details
        <ArrowLeftIcon className="h-3.5 w-3.5 rotate-180 transition-transform group-hover:translate-x-0.5" />
      </div>
    </Link>
  );
}
