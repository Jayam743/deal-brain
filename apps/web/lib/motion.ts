/** True when the visitor has asked the OS for reduced motion — checked at
 * animation time (not via a hook) so it works the same in effects that fire
 * once on mount. */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
