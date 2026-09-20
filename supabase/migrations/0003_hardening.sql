-- Deal Brain — deferred hardening from a follow-up review pass.
-- Additive only: no existing migration is rewritten (0001_init.sql, 0002_rls.sql stay as shipped).

-- ---------------------------------------------------------------------------
-- (a) Auto-provision public.users on signup. Without this, a new
-- auth.users row has no matching public.users row until the app
-- remembers to insert one — every FK'd table (wishlist_items, alerts, ...)
-- would silently orphan a brand-new user until then.
-- ---------------------------------------------------------------------------
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email)
  values (new.id, new.email);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- (b) "users update own" only had a USING clause (R-30 gap): a client could
-- send a row-changing update whose *new* row failed to satisfy the
-- ownership check and Postgres would still accept it, since USING alone
-- only gates which existing rows are visible/updatable, not the new values
-- written to them. Explicit WITH CHECK closes that.
-- ---------------------------------------------------------------------------
alter policy "users update own" on public.users
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ---------------------------------------------------------------------------
-- (c) Range sanity on percentage / threshold columns — these are numeric
-- with no prior bound, so a malformed write (e.g. a scraper bug) could
-- silently store a nonsensical 500% discount or a negative threshold.
-- ---------------------------------------------------------------------------
alter table public.coupons
  add constraint coupons_discount_percent_range
  check (discount_percent is null or (discount_percent >= 0 and discount_percent <= 100));

alter table public.deal_feed_items
  add constraint deal_feed_items_discount_percent_range
  check (discount_percent is null or (discount_percent >= 0 and discount_percent <= 100));

-- threshold_value is a percent (0-100) when threshold_type = 'percent', and
-- must simply be non-negative for the 'absolute' (dollar) case.
alter table public.wishlist_items
  add constraint wishlist_items_threshold_value_sane
  check (threshold_value >= 0 and (threshold_type <> 'percent' or threshold_value <= 100));

-- ---------------------------------------------------------------------------
-- (d) Identifier-exact matching (R-01, NG-7) already has partial-unique
-- indexes on upc/asin/wpid (0001_init.sql) but was missing gtin and sku —
-- without these, two rows could silently claim the same real-world product.
-- ---------------------------------------------------------------------------
create unique index products_gtin_idx on public.products (gtin) where gtin is not null;
create unique index products_sku_idx on public.products (sku) where sku is not null;
