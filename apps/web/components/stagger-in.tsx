"use client";

import { gsap } from "gsap";
import { useEffect, useRef } from "react";
import { prefersReducedMotion } from "@/lib/motion";

/**
 * One orchestrated entrance for a group of siblings — a single well-timed
 * moment, not a per-card scroll gimmick. Animates its direct children on
 * mount and honors prefers-reduced-motion by rendering them in place.
 */
export function StaggerIn({
  children,
  className,
  as: Tag = "div",
  y = 14,
  stagger = 0.06,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  as?: "div" | "section" | "ul";
  y?: number;
  stagger?: number;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node || prefersReducedMotion()) return;
    const items = Array.from(node.children);
    if (items.length === 0) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        items,
        { opacity: 0, y },
        { opacity: 1, y: 0, duration: 0.6, delay, stagger, ease: "power3.out" },
      );
    }, node);
    return () => ctx.revert();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const Component = Tag as "div";
  return (
    <Component ref={ref} className={className}>
      {children}
    </Component>
  );
}
