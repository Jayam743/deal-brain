# Changelog

All notable changes to this project are documented in this file. Format loosely follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/). This project has not yet cut a release —
everything below is `[Unreleased]`.

## [Unreleased]

### Added

- **Web shell** (`apps/web`) — Next.js 15 App Router site with `/dashboard`, `/deals`, `/wishlist`
  (+ `/wishlist/[id]`), `/deals/[id]`, `/settings`, and `/login` routes, redesigned with a dashboard
  hero, deal cards, verdict badges, sparklines, stagger-in animation, and a theme toggle.
- **Deal-verdict engine** (`packages/shared/src/verdict.ts`) — percentile-based verdict against a
  SKU's own logged price history, with tests (`verdict.test.ts`).
- **Real deal-feed ingestion** (`services/ingest`) — structured (no-LLM) parsing of DealNews and
  Slickdeals RSS plus the Woot API, with dedupe (`dedupe.ts`), store detection (`store-detect.ts`),
  and a `pnpm ingest` script that writes results to `packages/shared/src/deals-live.json`. The
  `/deals` page prefers this live feed and falls back to fixtures if it's absent or empty.
- **Best Buy adapter + price logger** (`services/adapters`) — `bestbuy.ts` client against the Best
  Buy Developer API (typed `BestBuyResult`, never throws on a missing key), `price-store.ts` for
  idempotent daily price logging, and a `pnpm log-prices` script that logs real or fixture prices
  depending on whether `BEST_BUY_API_KEY` is set.
- **Supabase auth** (`apps/web/lib/supabase`) — SSR-aware client/server Supabase helpers, a
  demo-mode gate (`isSupabaseConfigured`) so the app stays fully browsable on fixtures with zero env
  vars, and middleware that only gates `/wishlist` and `/settings` once Supabase is configured.
- **Database schema + hardening** (`supabase/migrations`) — `0001_init.sql` (full schema: products,
  prices, store_listings, store_inventory, coupons, code_votes, wishlist_items, deal_feed_items,
  push_subscriptions, feed_preferences, alerts, on_demand_checks, …), `0002_rls.sql` (deny-by-default
  RLS with public read policies for shared catalog data), and `0003_hardening.sql` (auto-provision
  `public.users` on signup via an `auth.users` trigger; fixed a missing `WITH CHECK` clause on the
  "users update own" policy).
- **Claude Code MCP bridge** (`services/mcp`) — a read-only stdio MCP server (`list_wishlist`,
  `get_product_context`, `search_deals`, `check_price`) plus a versioned Claude Code skill
  (`services/mcp/skill/`) so the app's "concierge" is Claude Code itself on an existing subscription,
  with no in-app LLM, no API cost, and no secrets exposed. See `docs/user-guide.md`.
- **Extension auto-apply engine (stub)** (`apps/extension`) — MV3 manifest scoped to Best Buy/Walmart
  cart and checkout pages, plus `autoapply.ts` (ranked-code application logic, tested in
  `autoapply.test.ts`) and `coupon-codes.ts`. `background.ts`/`content.ts` are Phase 1 stubs pending
  the Phase 3 auth'd session bridge.
- Project docs: `docs/env-prereqs.md` and `docs/deploy-verify.md` (environment setup and
  deploy/verification steps).

### Changed

- `apps/web` UI redesigned across the dashboard, deals, and wishlist explorers (deal cards, wishlist
  cards, verdict badges, sample-data badges, demo-mode hint) to make demo vs. live data status
  explicit rather than implied.

### Known follow-ups

- The extension is not yet Chrome-loadable as-is: its `build` script only runs `tsc --noEmit`
  (typecheck), but `manifest.json` points at compiled `src/background.js` / `src/content.js` — a
  bundler step is needed before it can be loaded unpacked.
- Wishlist reads (`getWishlistWithVerdicts`) are still fixture-backed; live Supabase reads for
  wishlist data are not yet wired even when Supabase auth is configured.
