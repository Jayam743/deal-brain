import { cx } from "@/lib/cx";

/**
 * A quiet, app-wide honesty marker: price history, verdicts, and coupon
 * codes (wishlist, deal-detail price context, matching codes) are stubbed
 * fixture data, not a live read — even once the deals feed itself goes live
 * (see the Deals page for that distinction). Deliberately muted — an FYI,
 * not a warning.
 */
export function SampleDataBadge({ className }: { className?: string }) {
  return (
    <span
      className={cx(
        "inline-flex max-w-full items-start gap-1.5 rounded-lg px-2.5 py-1.5 text-[10px] font-medium leading-snug",
        className,
      )}
      style={{ background: "var(--color-surface-raised)", color: "var(--color-text-muted)" }}
    >
      <span
        className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full"
        style={{ background: "var(--color-text-muted)" }}
      />
      Sample data · price history, verdicts &amp; codes — live deals feed excepted
    </span>
  );
}
