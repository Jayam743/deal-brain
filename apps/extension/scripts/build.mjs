// MV3 content script + service worker each need to be self-contained,
// loadable-by-URL scripts — Chrome's extension loader doesn't resolve
// `node_modules`/workspace imports at runtime. `@coupon-app/shared` ships
// its TS source directly (bundler-resolved, see its package.json `exports`),
// so we bundle with esbuild to inline the workspace package (and any other
// deps) into standalone `dist/content.js` / `dist/background.js` files.
import { build } from "esbuild";

await build({
  entryPoints: {
    content: "src/content.ts",
    background: "src/background.ts",
  },
  outdir: "dist",
  bundle: true,
  platform: "browser",
  target: "chrome110",
  format: "iife",
});

console.log("[build] Wrote dist/content.js, dist/background.js");
