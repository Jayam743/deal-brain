# scraper

Python worker reserved for an optional later live-fetch upgrade (Amazon/Micro Center scraping via
Scrapling), gated behind a legal/ToS usage-rights review. Not used in Phase 1 — Best Buy and Walmart
are price-tracked via their official APIs, no scraping.

`.venv/` here is a pre-existing local virtualenv and is left untouched (see repo root `.gitignore`).

> Note: this worker stays at the `scraper/` path rather than `services/scraper`, since relocating a
> live virtualenv risks breaking absolute interpreter paths baked into `.venv/bin/*` for no functional
> gain — nothing depends on the `services/` path yet. Revisit if/when this worker is actually wired up.
