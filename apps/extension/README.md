# @coupon-app/extension — Deal Brain (Chrome, MV3)

Checkout-page layer: watches a supported cart/checkout page for a promo-code
field, runs the ranked auto-apply engine (`src/autoapply.ts`) against it, and
renders a minimal overlay with the verdict + ranked codes for one-tap copy.
No hidden tabs, no affiliate-cookie manipulation (Trust Law).

Currently the content script matches Best Buy and Walmart cart/checkout URLs
only, and the codes it tries are the **verified** subset of the coupons
bundled at build time from `@coupon-app/shared` (`src/coupon-codes.ts`) — not
a live backend fetch yet. Wiring this up to the real `/codes` API is a later
phase; the `RankedCode[]` shape stays the same either way.

## Build

```
pnpm --filter @coupon-app/extension build
```

This runs `tsc --noEmit` (typecheck gate) and then bundles `src/content.ts`
and `src/background.ts` with esbuild into standalone, dependency-free
`dist/content.js` and `dist/background.js` — `@coupon-app/shared` (the
verified-codes data) is inlined at build time, since Chrome's extension
loader can't resolve workspace/`node_modules` imports at runtime.

## Load unpacked in Chrome

1. Run the build above.
2. Go to `chrome://extensions`.
3. Enable **Developer mode** (top right).
4. Click **Load unpacked** and select the `apps/extension` folder (the one
   containing `manifest.json` — it references the built files as
   `dist/content.js` / `dist/background.js`, so `dist/` must exist alongside
   it, i.e. the build step above must have run first).

`dist/` is generated and gitignored — rerun the build after pulling changes
or editing `src/`.
