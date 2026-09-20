// `@coupon-app/shared` ships its TS source directly (bundler-resolved, see its
// package.json `exports`) with extensionless relative imports — fine for
// Next.js/tsx, but Node's own ESM resolver can't load it directly. Since this
// package's `bin` must run under plain `node` (no dev-time loader), we bundle
// with esbuild so the workspace package's source is inlined into a single,
// self-contained `dist/index.js`. The MCP SDK and zod stay external — they're
// properly published packages that resolve fine via node_modules.
import { build } from "esbuild";

await build({
  entryPoints: ["src/index.ts"],
  outfile: "dist/index.js",
  bundle: true,
  platform: "node",
  target: "node20",
  format: "esm",
  external: ["@modelcontextprotocol/sdk", "zod"],
});

console.log("[build] Wrote dist/index.js");
