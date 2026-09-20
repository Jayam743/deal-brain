import type { WishlistWithVerdict } from "@coupon-app/shared";
import Link from "next/link";
import { formatMoney } from "@/lib/format";
import { ArrowLeftIcon } from "./nav-icons";
import { Sparkline } from "./sparkline";
import { VerdictBadge } from "./verdict-badge";

function thresholdLabel(item: { thresholdType: "percent" | "absolute"; thresholdValue: number }) {
  return item.thresholdType === "percent"
    ? `alert at −${item.thresholdValue}%`
    : `alert below ${formatMoney(item.thresholdValue)}`;
}

export function WishlistCard({
  item,
  history,
}: {
  item: WishlistWithVerdict;
  history: number[];
}) {
  return (
    <Link
      href={`/wishlist/${item.id}`}
      className="surface-card hover-lift group flex flex-col gap-5 px-6 py-5 md:flex-row md:items-center md:justify-between"
    >
      <div className="flex min-w-0 items-center gap-4">
        <div className="min-w-0">
          <div className="font-medium">{item.product.title}</div>
          <div className="mt-0.5 text-xs text-[color:var(--color-text-muted)]">
            {item.product.brand} · {item.product.category} · {thresholdLabel(item)}
          </div>
          <div className="tabular mt-2 font-mono text-lg font-semibold">
            {formatMoney(item.currentPrice)}
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-sm font-medium text-[color:var(--color-accent)]">
            View details
            <ArrowLeftIcon className="h-3.5 w-3.5 rotate-180 transition-transform group-hover:translate-x-0.5" />
          </div>
        </div>
        {history.length > 1 ? (
          <Sparkline data={history} width={120} height={40} area showRange rangeUnit="currency" />
        ) : null}
      </div>

      <VerdictBadge verdict={item.verdict} size="lg" />
    </Link>
  );
}
