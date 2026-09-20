import type { WishlistWithVerdict } from "@coupon-app/shared";
import type { CSSProperties } from "react";
import { CountUp } from "./count-up";
import { StaggerIn } from "./stagger-in";
import { VerdictBadge } from "./verdict-badge";

// The gauge is drawn against the constant dark-glass instrument bezel, not
// the theme surface — so its colors are pinned to the instrument tokens
// regardless of light/dark mode, same as the rest of this hero.
const instrumentPanelStyle: CSSProperties = {
  background: "rgba(255,255,255,0.05)",
  boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.14)",
  color: "var(--color-instrument-text)",
  ["--color-text-muted" as string]: "var(--color-instrument-text-muted)",
  ["--color-accent" as string]: "var(--color-instrument-accent)",
  ["--color-accent-glow" as string]: "var(--color-instrument-glow)",
  ["--color-border" as string]: "rgba(255,255,255,0.2)",
  ["--color-caution" as string]: "#f0b429",
};

export function DashboardHero({
  trackedCount,
  verifiedCount,
  trackedStores,
  flagship,
}: {
  trackedCount: number;
  verifiedCount: number;
  trackedStores: number;
  flagship: WishlistWithVerdict | undefined;
}) {
  return (
    <section
      className="relative overflow-hidden rounded-3xl px-7 py-9 sm:px-10 sm:py-12"
      style={{ background: "var(--gradient-hero)", boxShadow: "var(--shadow-lg)" }}
    >
      <StaggerIn className="relative flex flex-col gap-8 sm:flex-row sm:items-center sm:justify-between">
        <div className="max-w-md">
          <h1
            className="font-display text-3xl leading-[1.08] tracking-tight sm:text-4xl"
            style={{ color: "var(--color-instrument-text)" }}
          >
            The honest state of what you&rsquo;re tracking.
          </h1>
          <p
            className="mt-3 text-sm leading-relaxed"
            style={{ color: "var(--color-instrument-text-muted)" }}
          >
            No verdict is shown until there&rsquo;s history to back it. Every number here is
            measured, not modeled — across {trackedStores} tracked stores.
          </p>

          <div className="mt-6 flex items-center gap-6">
            <div>
              <div
                className="font-display tabular text-2xl font-semibold"
                style={{ color: "var(--color-instrument-text)" }}
              >
                <CountUp value={trackedCount} />
              </div>
              <div className="mt-1 text-xs" style={{ color: "var(--color-instrument-text-muted)" }}>
                items under watch
              </div>
            </div>
            <div className="h-9 w-px" style={{ background: "rgba(255,255,255,0.15)" }} />
            <div>
              <div
                className="font-display tabular text-2xl font-semibold"
                style={{ color: "var(--color-instrument-accent)" }}
              >
                <CountUp value={verifiedCount} />
              </div>
              <div className="mt-1 text-xs" style={{ color: "var(--color-instrument-text-muted)" }}>
                verified codes
              </div>
            </div>
          </div>
        </div>

        {flagship ? (
          <div
            className="flex shrink-0 flex-col items-start gap-3 overflow-visible rounded-2xl px-6 py-7"
            style={instrumentPanelStyle}
          >
            <span
              className="line-clamp-2 max-w-[220px] text-xs font-medium uppercase leading-snug tracking-wide sm:max-w-[280px]"
              style={{ color: "var(--color-instrument-text-muted)" }}
            >
              flagship verdict · {flagship.product.title}
            </span>
            <VerdictBadge verdict={flagship.verdict} size="lg" />
          </div>
        ) : null}
      </StaggerIn>
    </section>
  );
}
