"use client";

import { useState } from "react";

/** One-tap copy affordance for a coupon code — falls back silently if clipboard access is denied. */
export function CopyCodeButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(code);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          // Clipboard access can be denied by the browser — the code is
          // still visible and selectable, so this fails quietly.
        }
      }}
      className="rounded-full px-3 py-1 text-xs font-medium transition-colors"
      style={{
        background: copied ? "var(--color-accent-soft)" : "var(--color-surface-raised)",
        color: copied ? "var(--color-accent)" : "var(--color-text)",
      }}
    >
      {copied ? "Copied" : "Copy"}
    </button>
  );
}
