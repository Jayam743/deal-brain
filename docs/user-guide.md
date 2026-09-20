# User guide — Claude Code bridge

Deal Brain's "concierge" isn't an in-app LLM — it's **Claude Code itself, on your existing
subscription**. This is $0: no API key, no per-token cost, no in-app model reading untrusted
feeds. Two pieces make it work, both living in this repo:

- `services/mcp/` — a read-only MCP server exposing wishlist verdicts, product context, deal-feed
  search, and the F10 on-demand price check.
- `services/mcp/skill/` — a Claude Code skill ("deal-brain") that knows when and how to use it.

Nothing below runs itself — these are one-time setup steps for you to run.

## 1. Build the server

```bash
cd services/mcp
pnpm build
```

This produces `services/mcp/dist/index.js` — a self-contained, read-only stdio MCP server (no
writes, no secrets exposed).

## 2. Register the MCP server with Claude Code

```bash
claude mcp add deal-brain -- node /home/jayam/dev/coupon-app/services/mcp/dist/index.js
```

(Adjust the path if your checkout lives somewhere else.) This registers a local stdio server named
`deal-brain` that any Claude Code session can talk to. Verify it's connected with `claude mcp list`
or `/mcp` inside a session.

> Requires Node ≥22.6 (native TypeScript support, unflagged by default from Node ≥23.6 — this repo
> was verified on Node 24). `@coupon-app/shared` ships its TS source directly and the MCP build
> inlines it via esbuild, so no separate build step is needed for `packages/shared`.

## 3. Install the skill

The skill lives in the repo (`services/mcp/skill/`), not `~/.claude`, so it stays versioned with
the server it talks to. Symlink it in (recommended, so repo edits show up immediately) or copy it:

```bash
# symlink (recommended)
ln -s /home/jayam/dev/coupon-app/services/mcp/skill ~/.claude/skills/deal-brain

# or copy, if you'd rather not symlink
cp -r /home/jayam/dev/coupon-app/services/mcp/skill ~/.claude/skills/deal-brain
```

## 4. Talk to it

Open a Claude Code session anywhere and ask things like:

- "I'm looking at the RTX 4070 Super at Best Buy for $520 — is that worth it?"
- "How's my wishlist looking? Anything worth buying right now?"
- "Found the WH-1000XM5 on Amazon for $299, good deal or not?"
- "Any deals on NVMe SSDs today?"

Claude Code will call the `deal-brain` MCP tools (`list_wishlist`, `get_product_context`,
`search_deals`, `check_price`) to pull real data before answering — and it inherits the app's Trust
Law: it will tell you plainly when something is context/sample data rather than a live, confirmed
verdict.
