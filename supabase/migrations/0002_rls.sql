-- Row Level Security — deny-by-default (R-30).
--
-- Enabling RLS with no policies denies all access to anon/authenticated roles; only the
-- server-side service_role key (never exposed to the browser/extension) bypasses RLS. Every
-- policy below is additive on top of that default-deny floor.

-- ---------------------------------------------------------------------------
-- users — a user manages only their own profile row.
-- ---------------------------------------------------------------------------
alter table public.users enable row level security;

create policy "users select own" on public.users
  for select using (auth.uid() = id);

create policy "users update own" on public.users
  for update using (auth.uid() = id);

-- ---------------------------------------------------------------------------
-- Shared catalog / reference data — public read-only (the extension's
-- read-only anon path for public lookups, §7). Writes happen only via the
-- server-side service_role (cron, adapters), which bypasses RLS entirely, so
-- no insert/update/delete policy is granted here.
-- ---------------------------------------------------------------------------
alter table public.store_retailers enable row level security;
create policy "store_retailers public read" on public.store_retailers
  for select using (true);

alter table public.store_locations enable row level security;
create policy "store_locations public read" on public.store_locations
  for select using (true);

alter table public.products enable row level security;
create policy "products public read" on public.products
  for select using (true);

alter table public.store_listings enable row level security;
create policy "store_listings public read" on public.store_listings
  for select using (true);

alter table public.prices enable row level security;
create policy "prices public read" on public.prices
  for select using (true);

alter table public.store_inventory enable row level security;
create policy "store_inventory public read" on public.store_inventory
  for select using (true);

alter table public.coupons enable row level security;
create policy "coupons public read" on public.coupons
  for select using (true);

alter table public.deal_feed_items enable row level security;
create policy "deal_feed_items public read" on public.deal_feed_items
  for select using (true);

-- ---------------------------------------------------------------------------
-- Per-user data — a user sees and manages only their own rows (R-30).
-- ---------------------------------------------------------------------------
alter table public.wishlist_items enable row level security;
create policy "wishlist_items own rows" on public.wishlist_items
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table public.alerts enable row level security;
create policy "alerts select own" on public.alerts
  for select using (auth.uid() = user_id);

alter table public.push_subscriptions enable row level security;
create policy "push_subscriptions own rows" on public.push_subscriptions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table public.feed_preferences enable row level security;
create policy "feed_preferences own rows" on public.feed_preferences
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table public.on_demand_checks enable row level security;
create policy "on_demand_checks own rows" on public.on_demand_checks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table public.code_votes enable row level security;
create policy "code_votes select own" on public.code_votes
  for select using (auth.uid() = user_id);
create policy "code_votes insert own" on public.code_votes
  for insert with check (auth.uid() = user_id);
