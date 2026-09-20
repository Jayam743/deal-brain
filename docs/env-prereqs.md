# Environment prerequisites

Deal Brain runs in **$0 demo mode with zero environment variables set** — every page renders from
typed fixtures in `packages/shared/src/fixtures.ts`. The env vars below only *light up* real
integrations; none are required just to `pnpm dev` and click around.

## Tooling

- **Node.** `package.json` declares `engines.node: ">=20"` for the app/monorepo build. The
  `services/mcp` server additionally needs **Node ≥22.6** to run its bridge unbundled via
  `pnpm dev`/`tsx` (native TypeScript support, unflagged by default from Node ≥23.6 — verified on
  Node 24 per `docs/user-guide.md`). The production `services/mcp` build (`pnpm build` →
  `dist/index.js`, esbuild-bundled) does not need this — only the MCP dev/watch path does.
- **pnpm.** `packageManager: pnpm@12.3.4` (see root `package.json`). Use Corepack or install that
  pnpm version directly; the workspace is defined in `pnpm-workspace.yaml`
  (`apps/*`, `packages/*`, `services/*`).
- **Turborepo** (`turbo`) is a devDependency at the root — no separate install needed; `pnpm install`
  pulls it in.

## Environment variables (`.env.example` → `.env`)

Copy `.env.example` to `.env` at the repo root. Every var is optional; the columns below say what
turns on when you set it and where each one is read.

| Var | Scope | Goes in | Feature it unlocks |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Public (browser-safe) | `apps/web` `.env` | Real Supabase Auth + RLS-gated reads for `/wishlist` and `/settings`. Without it, those routes render fixtures with no login wall (`apps/web/lib/supabase/config.ts`, `middleware.ts`). |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public (browser-safe) | `apps/web` `.env` | Same as above — both `NEXT_PUBLIC_SUPABASE_*` vars must be set together (`isSupabaseConfigured()` checks both). |
| `SUPABASE_SERVICE_ROLE_KEY` | **Server-only — NEVER `NEXT_PUBLIC_`** | server-side `.env` (never shipped to the client; bypasses RLS) | Reserved for server-side/admin Supabase operations. Prefixing it `NEXT_PUBLIC_` would leak full DB access to the browser — never do this. |
| `BEST_BUY_API_KEY` | Server-only | `.env` at repo root, read by `services/adapters/src/bestbuy.ts` and `pnpm log-prices` | Real Best Buy Developer API lookups (live SKU price/availability). Without it, `services/adapters` and `pnpm log-prices` fall back to fixture prices and the app still builds and runs (`isBestBuyConfigured()`). |
| `WOOT_API_KEY` | Server-only, optional | `.env` at repo root, read by `services/ingest/src/index.ts` via `pnpm ingest` | Enables the Woot deal-feed source. Without it, `pnpm ingest` logs "no WOOT_API_KEY set — skipped (optional source)" and still ingests DealNews + Slickdeals RSS (no key needed for those). |
| `WALMART_IMPACT_API_KEY` | Server-only | `.env` | Phase 2+, not yet wired to any code path. |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | Public / server-only | `.env` | Web push (VAPID) — not yet wired to any code path. |
| `RESEND_API_KEY` | Server-only | `.env` | Phase 2+ email alerts (Resend free tier, 100/day cap) — not yet wired to any code path. |

## Free accounts needed (only if you want live data)

- **Supabase** — create a free project for `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  / `SUPABASE_SERVICE_ROLE_KEY`. Then apply `supabase/migrations/*.sql` (see `docs/deploy-verify.md`).
- **Best Buy Developer API** — free-tier key for `BEST_BUY_API_KEY`
  (https://bestbuyapis.github.io/api-documentation/).
- **Woot API** — optional free key for `WOOT_API_KEY`; DealNews and Slickdeals ingest via public RSS
  and need no key at all.

## Summary

- **No keys set:** full $0 demo mode — fixtures everywhere, no login wall, `pnpm dev` just works.
- **Supabase keys set:** real auth kicks in and `/wishlist`, `/settings` become login-gated.
- **`BEST_BUY_API_KEY` set:** `pnpm log-prices` and the Best Buy adapter hit the real API instead of
  fixture prices.
- **`WOOT_API_KEY` set:** `pnpm ingest` also pulls Woot alongside DealNews/Slickdeals.
