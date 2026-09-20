# Deploy & verify

See `docs/env-prereqs.md` first for what each environment variable does and whether you need it —
everything here works with zero keys set (demo mode) unless a step says otherwise.

## 1. Local dev

```bash
pnpm install
pnpm dev
```

`pnpm dev` runs `turbo run dev --parallel` across the workspace; the web shell is at
http://localhost:3000 (redirects to `/dashboard`). No `.env` is required — the app renders from
fixtures in `packages/shared/src/fixtures.ts`.

Other useful commands (from root `package.json`):

```bash
pnpm lint         # ESLint across every workspace
pnpm typecheck    # tsc --noEmit across every workspace
pnpm test         # Vitest across every workspace
pnpm build        # turbo run build (production build for every workspace)
pnpm format       # prettier --write .
```

## 2. Real deal feeds (`pnpm ingest`)

```bash
pnpm ingest
```

Runs `services/ingest` (`src/index.ts`), which fetches DealNews + Slickdeals RSS (no key needed)
and Woot (needs `WOOT_API_KEY`, otherwise skipped), dedupes them (`dedupe.ts`), and writes the
combined, sorted result to `packages/shared/src/deals-live.json`. The web app's `/deals` page reads
this file when present (`isLiveDealFeed`) and falls back to the static fixture feed if it's absent
or a run comes back empty (`apps/web/app/deals/page.tsx`). Safe to run repeatedly — a failed source
is skipped with a warning, not a crash, and an all-empty run leaves the existing `deals-live.json`
untouched.

## 3. Database (Supabase migrations)

Needs a Supabase project (see `docs/env-prereqs.md`). Apply the schema in order:

```bash
supabase db reset   # local Supabase instance: applies supabase/migrations/*.sql + supabase/seed.sql
```

Or, against a hosted project, run the three migrations in order via `supabase db push` or the SQL
editor:

1. `supabase/migrations/0001_init.sql` — full schema (products, prices, store_listings,
   store_inventory, coupons, code_votes, wishlist_items, deal_feed_items, push_subscriptions,
   feed_preferences, alerts, on_demand_checks, …).
2. `supabase/migrations/0002_rls.sql` — Row Level Security, deny-by-default, per-user policies, plus
   public read policies for shared catalog data (products, prices, coupons, …).
3. `supabase/migrations/0003_hardening.sql` — additive hardening from a follow-up review pass:
   auto-provision `public.users` on signup (trigger on `auth.users`), and a `WITH CHECK` fix on the
   "users update own" policy.

Then set `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` (and `SUPABASE_SERVICE_ROLE_KEY`
if you need server-side/admin access) in `.env` for `apps/web`. Real auth and RLS-gated reads turn
on for `/wishlist` and `/settings` the moment both public vars are set
(`apps/web/lib/supabase/config.ts`).

## 4. Price logging (`pnpm log-prices`)

```bash
pnpm log-prices
```

Runs `services/adapters` (`src/log-prices.ts`) against every wishlisted product that has a Best Buy
SKU. With `BEST_BUY_API_KEY` set, it fetches the live price from the Best Buy Developer API; without
it, it logs the fixture price instead — either way it writes one price observation per SKU via
`price-store.ts` (idempotent per day). This is the source of the price history the verdict engine
(`packages/shared/src/verdict.ts`) percentiles against.

## 5. Build + register the MCP server

```bash
cd services/mcp
pnpm build
```

Produces `services/mcp/dist/index.js` — a self-contained, read-only stdio MCP server (esbuild-bundled,
inlines `@coupon-app/shared`; no writes, no secrets exposed). Register it with Claude Code:

```bash
claude mcp add deal-brain -- node /home/jayam/dev/coupon-app/services/mcp/dist/index.js
```

Verify with `claude mcp list` or `/mcp` inside a session. Full setup (including the Claude Code skill
at `services/mcp/skill/`) is in `docs/user-guide.md`.

## 6. Deployment (high level)

- **Web (`apps/web`)** — deploy to Vercel. Set the environment variables from
  `docs/env-prereqs.md` in the Vercel project settings (never set `SUPABASE_SERVICE_ROLE_KEY` or
  `BEST_BUY_API_KEY` as public/`NEXT_PUBLIC_` vars). Build command is the workspace default
  (`next build`, via `apps/web/package.json`'s `build` script).
- **Database (Supabase)** — use a hosted Supabase project; apply the three migrations above (step 3)
  against it, then point the deployed web app's env vars at that project.
- **Feed ingestion / price logging** — `pnpm ingest` and `pnpm log-prices` are scripts, not long-running
  services; run them on a schedule (e.g. a cron job or scheduled CI workflow) against the deployed
  environment if you want live data to stay fresh in production. Neither is wired to a scheduler in
  this repo yet.
- **MCP server** — runs locally (stdio), registered per-machine with `claude mcp add` as in step 5;
  it is not deployed to Vercel/Supabase.

## Post-deploy verification checklist

- [ ] `/`, `/dashboard`, `/deals`, `/wishlist`, `/settings` all return 200 and render (fixtures are
      fine if no keys are set — check for the demo-mode hint / sample-data badge instead of an error).
- [ ] `pnpm ingest` completes and either updates `packages/shared/src/deals-live.json` or logs which
      source(s) were unreachable, without throwing.
- [ ] `pnpm log-prices` completes and logs at least one price observation (fixture or live).
- [ ] If Supabase keys are set: visiting `/wishlist` or `/settings` signed-out redirects to `/login`;
      signed-in it loads without the demo-mode hint.
- [ ] `claude mcp list` shows `deal-brain` connected, and a query like "how's my wishlist looking?"
      in a Claude Code session returns a response that used the MCP tools.
- [ ] `pnpm build` and `pnpm test` are green across the workspace.
