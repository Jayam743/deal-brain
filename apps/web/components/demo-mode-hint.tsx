import { cx } from "@/lib/cx";

/**
 * Quiet honesty marker for user-scoped pages (wishlist, settings) when
 * Supabase isn't configured — sign-in is disabled and the page is rendering
 * on the shared fixture identity instead of a real session (R-30 §3).
 * Deliberately muted, same tone as SampleDataBadge.
 */
export function DemoModeHint({ className }: { className?: string }) {
  return (
    <span
      className={cx(
        "inline-flex w-fit items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] font-medium",
        className,
      )}
      style={{ background: "var(--color-surface-raised)", color: "var(--color-text-muted)" }}
    >
      <span
        className="h-1.5 w-1.5 shrink-0 rounded-full"
        style={{ background: "var(--color-text-muted)" }}
      />
      Demo mode · sign-in disabled, showing the sample account
    </span>
  );
}
