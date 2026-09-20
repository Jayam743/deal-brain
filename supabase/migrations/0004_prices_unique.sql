-- Deal Brain — one price observation per listing per day (Supabase
-- price-persistence hardening). Additive only, per the 0003_hardening.sql convention.
--
-- Without this, a retried/concurrent `log-prices` run whose app-level
-- `hasLoggedToday` check fails open (e.g. a transient read error) could write
-- a second `prices` row for the same store_listing on the same day. The
-- functional unique index below makes the day-level dedupe a DB guarantee,
-- not just an app-level convention — `SupabasePriceStore.append()` treats
-- the resulting conflict as an idempotent no-op rather than an error.
create unique index if not exists prices_listing_day_uidx
  on public.prices (store_listing_id, (captured_at::date));
