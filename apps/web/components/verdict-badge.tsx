"use client";

import type { VerdictResult } from "@coupon-app/shared";
import { gsap } from "gsap";
import { useEffect, useRef } from "react";
import { formatRelativeTime } from "@/lib/format";
import { prefersReducedMotion } from "@/lib/motion";

function percentileRead(percentile: number): string {
  if (percentile >= 85) return "near a logged low";
  if (percentile >= 60) return "below its typical price";
  if (percentile >= 40) return "near its typical price";
  if (percentile >= 15) return "above its typical price";
  return "near a logged high";
}

const GAUGE_SIZE = 84;
const STROKE = 6.5;
const RADIUS = (GAUGE_SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/**
 * The certified seal: a gauge, not a chip. Jade always means "we have a
 * measured answer" — it never editorializes how good that answer is. Amber
 * is reserved for the honest "still measuring" state.
 */
function Gauge({
  percentile,
  measuring,
  glow,
}: {
  percentile: number;
  measuring: boolean;
  glow: boolean;
}) {
  const arcRef = useRef<SVGCircleElement>(null);

  useEffect(() => {
    const el = arcRef.current;
    if (!el || measuring) return;
    const target = CIRCUMFERENCE * (1 - percentile / 100);

    if (prefersReducedMotion()) {
      el.style.strokeDashoffset = String(target);
      return;
    }

    gsap.set(el, { strokeDashoffset: CIRCUMFERENCE });
    const tween = gsap.to(el, {
      strokeDashoffset: target,
      duration: 1.2,
      delay: 0.1,
      ease: "back.out(1.4)",
    });
    return () => {
      tween.kill();
    };
  }, [percentile, measuring]);

  return (
    <svg
      width={GAUGE_SIZE}
      height={GAUGE_SIZE}
      viewBox={`0 0 ${GAUGE_SIZE} ${GAUGE_SIZE}`}
      className="-rotate-90"
      aria-hidden="true"
    >
      <circle
        cx={GAUGE_SIZE / 2}
        cy={GAUGE_SIZE / 2}
        r={RADIUS}
        fill="none"
        stroke="var(--color-border)"
        strokeWidth={STROKE}
        opacity={0.5}
      />
      {measuring ? (
        <circle
          cx={GAUGE_SIZE / 2}
          cy={GAUGE_SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke="var(--color-caution)"
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={`${CIRCUMFERENCE * 0.05} ${CIRCUMFERENCE * 0.075}`}
          className="animate-measuring"
        />
      ) : (
        <circle
          ref={arcRef}
          cx={GAUGE_SIZE / 2}
          cy={GAUGE_SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke="var(--color-accent)"
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={CIRCUMFERENCE}
          style={glow ? { filter: "drop-shadow(0 0 5px var(--color-accent-glow))" } : undefined}
        />
      )}
    </svg>
  );
}

/** Compact readout — for dense contexts (dashboard tables, deal-detail rows). */
function CompactVerdict({ verdict }: { verdict: VerdictResult }) {
  if (verdict.status === "insufficient-data") {
    return (
      <div className="flex flex-col gap-1">
        <div
          className="inline-flex w-fit items-center gap-2 rounded-full border px-2.5 py-1 text-sm"
          style={{ borderColor: "var(--color-border)", color: "var(--color-caution)" }}
        >
          <span
            className="h-1.5 w-1.5 shrink-0 rounded-full animate-measuring"
            style={{ background: "var(--color-caution)" }}
          />
          still measuring — verdict in ~{verdict.daysUntilVerdict}d
        </div>
        <span className="text-xs text-[color:var(--color-text-muted)]">
          tracking started {formatRelativeTime(verdict.lastCheckedAt)}
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="inline-flex w-fit items-center gap-2 text-sm">
        <span
          className="h-1.5 w-1.5 shrink-0 rounded-full"
          style={{
            background: "var(--color-accent)",
            boxShadow:
              verdict.confidenceLabel === "high" ? "0 0 6px var(--color-accent-glow)" : undefined,
          }}
        />
        <span className="tabular font-mono font-medium">{verdict.percentile}th pctile</span>
        <span style={{ color: "var(--color-text-muted)" }}>
          · {percentileRead(verdict.percentile!)}
        </span>
      </div>
      <span className="text-xs text-[color:var(--color-text-muted)]">
        {verdict.confidenceLabel} confidence · last checked{" "}
        {formatRelativeTime(verdict.lastCheckedAt)}
      </span>
    </div>
  );
}

/** Full gauge centerpiece — the design signature, for wishlist cards and deal detail. */
function GaugeVerdict({ verdict }: { verdict: VerdictResult }) {
  const measuring = verdict.status === "insufficient-data";

  return (
    <div className="flex items-center gap-4">
      <div className="relative flex h-[84px] w-[84px] shrink-0 items-center justify-center">
        <Gauge
          percentile={verdict.percentile ?? 0}
          measuring={measuring}
          glow={verdict.confidenceLabel === "high"}
        />
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {measuring ? (
            <span
              className="text-[11px] font-medium"
              style={{ color: "var(--color-caution)" }}
            >
              measuring
            </span>
          ) : (
            <>
              <span className="font-display tabular text-2xl font-semibold leading-none">
                {verdict.percentile}
              </span>
              <span className="mt-0.5 text-[10px] text-[color:var(--color-text-muted)]">
                pctile
              </span>
            </>
          )}
        </div>
      </div>
      <div className="min-w-0">
        {measuring ? (
          <>
            <div className="text-sm font-medium">verdict in ~{verdict.daysUntilVerdict}d</div>
            <div className="mt-0.5 text-xs text-[color:var(--color-text-muted)]">
              tracking started {formatRelativeTime(verdict.lastCheckedAt)}
            </div>
          </>
        ) : (
          <>
            <div className="text-sm font-medium">{percentileRead(verdict.percentile!)}</div>
            <div className="mt-0.5 text-xs text-[color:var(--color-text-muted)]">
              {verdict.confidenceLabel} confidence · last checked{" "}
              {formatRelativeTime(verdict.lastCheckedAt)}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export function VerdictBadge({
  verdict,
  size = "sm",
}: {
  verdict: VerdictResult;
  size?: "sm" | "lg";
}) {
  return size === "lg" ? (
    <GaugeVerdict verdict={verdict} />
  ) : (
    <CompactVerdict verdict={verdict} />
  );
}
