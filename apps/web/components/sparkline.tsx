"use client";

import { gsap } from "gsap";
import { useEffect, useId, useRef } from "react";
import { formatMoney } from "@/lib/format";
import { prefersReducedMotion } from "@/lib/motion";

/** A price-history / trend read-out that draws itself left-to-right on first paint. */
export function Sparkline({
  data,
  width = 96,
  height = 32,
  color = "var(--color-accent)",
  strokeWidth = 1.75,
  area = false,
  showRange = false,
  rangeUnit = "number",
}: {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  strokeWidth?: number;
  area?: boolean;
  /** Shows a small "low $X · high $Y" caption below the plotted line. */
  showRange?: boolean;
  /**
   * Kept as a serializable string (not a formatter function) since server
   * components render this "use client" component — functions can't cross
   * that boundary.
   */
  rangeUnit?: "number" | "currency";
}) {
  const lineRef = useRef<SVGPolylineElement>(null);
  const gradientId = useId();

  const min = data.length === 0 ? 0 : Math.min(...data);
  const max = data.length === 0 ? 0 : Math.max(...data);

  const points =
    data.length === 0
      ? ""
      : (() => {
          const span = max - min || 1;
          const stepX = width / Math.max(data.length - 1, 1);
          const pad = strokeWidth * 1.5;
          return data
            .map((value, i) => {
              const x = i * stepX;
              const y = pad + (1 - (value - min) / span) * (height - pad * 2);
              return `${x.toFixed(2)},${y.toFixed(2)}`;
            })
            .join(" ");
        })();

  useEffect(() => {
    const el = lineRef.current;
    if (!el || data.length < 2) return;
    const length = el.getTotalLength();

    if (prefersReducedMotion()) {
      el.style.strokeDasharray = "none";
      return;
    }

    gsap.set(el, { strokeDasharray: length, strokeDashoffset: length });
    const tween = gsap.to(el, {
      strokeDashoffset: 0,
      duration: 1.1,
      ease: "power2.out",
    });
    return () => {
      tween.kill();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points]);

  if (data.length < 2) return null;

  const formatValue = rangeUnit === "currency" ? formatMoney : (value: number) => value.toLocaleString();

  return (
    <div className="flex flex-col gap-1" style={{ width }}>
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="overflow-visible"
        aria-hidden="true"
      >
        {area ? (
          <>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.22} />
                <stop offset="100%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <polygon
              points={`0,${height} ${points} ${width},${height}`}
              fill={`url(#${gradientId})`}
              stroke="none"
            />
          </>
        ) : null}
        <polyline
          ref={lineRef}
          points={points}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {showRange ? (
        <div className="tabular flex items-center justify-between font-mono text-[10px] text-[color:var(--color-text-muted)]">
          <span>low {formatValue(min)}</span>
          <span>high {formatValue(max)}</span>
        </div>
      ) : null}
    </div>
  );
}
