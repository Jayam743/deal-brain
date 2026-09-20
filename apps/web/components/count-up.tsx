"use client";

import { gsap } from "gsap";
import { useEffect, useRef } from "react";
import { prefersReducedMotion } from "@/lib/motion";

/** Counts a number up from 0 on mount — the instrument taking its reading. */
export function CountUp({
  value,
  duration = 1,
  format,
}: {
  value: number;
  duration?: number;
  format?: (n: number) => string;
}) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const render = (n: number) => (format ? format(n) : String(n));

    if (prefersReducedMotion()) {
      el.textContent = render(value);
      return;
    }

    const counter = { n: 0 };
    const tween = gsap.to(counter, {
      n: value,
      duration,
      ease: "power2.out",
      onUpdate: () => {
        el.textContent = render(Math.round(counter.n));
      },
    });
    return () => {
      tween.kill();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, duration]);

  return (
    <span ref={ref} className="tabular">
      {format ? format(0) : "0"}
    </span>
  );
}
