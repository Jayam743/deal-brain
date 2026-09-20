# Deal Brain

An honest buying-decision engine: real price verdicts, verified coupon codes, and an auto-apply
checkout layer — governed by one non-negotiable rule, the Trust Law: **never fake a deal.** If the
data doesn't support a verdict, Deal Brain says so instead of dressing up a guess as a "great deal!"

## Features

- **Price verdicts** — percentile-based verdicts against a SKU's own logged price history, not a
  generic "deal score."
- **Verified coupon codes** — codes are ranked and only the verified subset is ever surfaced or
  auto-applied.
- **Auto-apply checkout layer** — a Chrome extension that finds the promo-code field on supported
  checkout pages and applies the best verified code, with a minimal overlay showing the verdict.
- **Real deal-feed ingestion** — structured (no-LLM) parsing of DealNews and Slickdeals RSS, plus
  the Woot API, deduped and merged into one feed.
- **Claude Code concierge bridge** — a read-only MCP server + Claude Code skill so you can ask
  "is this a good price?" from any Claude Code session, backed by your real wishlist and price
  history, with zero added API cost.
- **Demo mode by default** — the entire app renders from typed fixtures with no environment
  variables set, so it's fully browsable out of the box.

## Tech stack

- **Web** — Next.js 15 (App Router), TypeScript, Tailwind CSS
- **Database / auth** — Supabase (Postgres, Row Level Security, SSR-aware auth)
- **Monorepo** — pnpm workspaces + Turborepo
- **Extension** — Chrome MV3, esbuild-bundled, no runtime dependencies
- **Concierge** — a stdio MCP server + Claude Code skill (no in-app LLM, no per-token cost)

## Project layout

| Path | What it is |
|---|---|
| `apps/web` | Next.js 15 (App Router) + TS + Tailwind — the Deal Brain web shell |
| `apps/extension` | Chrome MV3 extension — the auto-apply checkout layer |
| `packages/shared` | Domain types, the deal-verdict percentile engine, and fixture data |
| `services/ingest` | Deal-feed ingestion (Woot/DealNews/Slickdeals) — no LLM, structured parse only |
| `services/adapters` | Best Buy API client + idempotent daily price logger |
| `services/mcp` | Read-only MCP server + Claude Code skill (the concierge bridge) |
| `scraper/` | Python worker reserved for a later, legally-gated live-fetch upgrade (unused today) |
| `supabase/` | SQL migrations (schema + RLS) and a seed script for the fixed store roster |

## Quick start

```bash
pnpm install
pnpm dev
```

Open http://localhost:3000 (redirects to `/dashboard`). No environment variables are required —
the app runs entirely in demo mode against typed fixtures in `packages/shared/src/fixtures.ts`.

Other useful commands:

```bash
pnpm lint         # ESLint across every workspace
pnpm typecheck    # tsc --noEmit across every workspace
pnpm test         # Vitest (unit tests for the verdict engine live in packages/shared)
pnpm build        # production build
```

## Status / Roadmap

Deal Brain currently runs on demo data by default and has the full Supabase schema ready to go.
Planned next:

- **Live prices** — wire up a Best Buy Developer API key and a Supabase project for real price
  history instead of fixtures (see `docs/env-prereqs.md`).
- **Walmart** — add Walmart as a second tracked store alongside Best Buy.
- **Real coupon sourcing** — replace the bundled sample coupon set with a live, verified source.
- **Chrome Web Store packaging** — bundle and ship the extension as a proper Chrome Web Store
  listing instead of a "load unpacked" dev build.

## Docs

- [`docs/user-guide.md`](docs/user-guide.md) — setting up the Claude Code concierge bridge
- [`docs/env-prereqs.md`](docs/env-prereqs.md) — environment variables and what each one unlocks
- [`docs/deploy-verify.md`](docs/deploy-verify.md) — local dev, deployment, and a post-deploy
  verification checklist
