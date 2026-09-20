-- Deal Brain — Phase 1 schema.
--
-- Design note: domain enums (verified_status, threshold_type, ...) are modeled as `text` + `check`
-- constraints rather than Postgres ENUM types. This is the minimal conventional choice for a v1 that
-- will keep adding sources/states — a check constraint is a one-line migration to widen, an enum
-- requires ALTER TYPE ceremony. Revisit if a column needs enum-level exhaustiveness checks elsewhere.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- users — a thin profile mirror of auth.users, so app tables can FK a plain
-- public-schema table without reaching into the auth schema everywhere.
-- ---------------------------------------------------------------------------
create table public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Catalog: stores, products, listings
-- ---------------------------------------------------------------------------
create table public.store_retailers (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug in ('best_buy', 'walmart', 'amazon', 'micro_center')),
  name text not null,
  role text not null check (role in ('tracked', 'awareness')),
  created_at timestamptz not null default now()
);

create table public.store_locations (
  id uuid primary key default gen_random_uuid(),
  store_retailer_id uuid not null references public.store_retailers (id) on delete cascade,
  external_location_id text not null,
  zip text not null,
  city text,
  state text,
  created_at timestamptz not null default now(),
  unique (store_retailer_id, external_location_id)
);
create index store_locations_store_retailer_id_idx on public.store_locations (store_retailer_id);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  brand text,
  category text not null,
  image_url text,
  -- Identifier-exact matching only (R-01, NG-7) — no fuzzy cross-retailer matching.
  upc text,
  gtin text,
  asin text,
  wpid text,
  sku text,
  created_at timestamptz not null default now()
);
create unique index products_upc_idx on public.products (upc) where upc is not null;
create unique index products_asin_idx on public.products (asin) where asin is not null;
create unique index products_wpid_idx on public.products (wpid) where wpid is not null;

create table public.store_listings (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  store_retailer_id uuid not null references public.store_retailers (id) on delete cascade,
  external_url text not null,
  external_id text not null,
  created_at timestamptz not null default now(),
  unique (store_retailer_id, external_id)
);
create index store_listings_product_id_idx on public.store_listings (product_id);
create index store_listings_store_retailer_id_idx on public.store_listings (store_retailer_id);

-- ---------------------------------------------------------------------------
-- Prices (append-only time series, R-05) + location-keyed inventory
-- ---------------------------------------------------------------------------
create table public.prices (
  id uuid primary key default gen_random_uuid(),
  store_listing_id uuid not null references public.store_listings (id) on delete cascade,
  -- Denormalized for the (product_id, captured_at) history index (R-06 percentile scans).
  product_id uuid not null references public.products (id) on delete cascade,
  price numeric(10, 2) not null,
  currency text not null default 'USD',
  was_price numeric(10, 2),
  captured_at timestamptz not null default now()
);
create index prices_store_listing_id_idx on public.prices (store_listing_id);
create index prices_product_id_captured_at_idx on public.prices (product_id, captured_at);

create table public.store_inventory (
  id uuid primary key default gen_random_uuid(),
  store_listing_id uuid not null references public.store_listings (id) on delete cascade,
  store_location_id uuid not null references public.store_locations (id) on delete cascade,
  in_stock boolean not null,
  quantity integer,
  checked_at timestamptz not null default now()
);
create index store_inventory_store_listing_id_idx on public.store_inventory (store_listing_id);
create index store_inventory_store_location_id_idx on public.store_inventory (store_location_id);

-- ---------------------------------------------------------------------------
-- The Code Layer (F3+F4)
-- ---------------------------------------------------------------------------
create table public.coupons (
  id uuid primary key default gen_random_uuid(),
  store_retailer_id uuid not null references public.store_retailers (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  code text not null,
  description text,
  discount_percent numeric(5, 2),
  discount_amount numeric(10, 2),
  verified_status text not null default 'unverified'
    check (verified_status in ('verified', 'unverified', 'quarantined')),
  last_verified_at timestamptz,
  success_count integer not null default 0,
  total_votes integer not null default 0,
  created_at timestamptz not null default now()
);
create index coupons_store_retailer_id_idx on public.coupons (store_retailer_id);
create index coupons_product_id_idx on public.coupons (product_id);

create table public.code_votes (
  id uuid primary key default gen_random_uuid(),
  coupon_id uuid not null references public.coupons (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  value text not null check (value in ('worked', 'did_not_work')),
  created_at timestamptz not null default now(),
  unique (coupon_id, user_id)
);
create index code_votes_coupon_id_idx on public.code_votes (coupon_id);
create index code_votes_user_id_idx on public.code_votes (user_id);

-- ---------------------------------------------------------------------------
-- Wishlist + alerts (F1)
-- ---------------------------------------------------------------------------
create table public.wishlist_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  threshold_type text not null check (threshold_type in ('percent', 'absolute')),
  threshold_value numeric(10, 2) not null,
  created_at timestamptz not null default now(),
  unique (user_id, product_id)
);
create index wishlist_items_user_id_idx on public.wishlist_items (user_id);
create index wishlist_items_product_id_idx on public.wishlist_items (product_id);

create table public.alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  wishlist_item_id uuid not null references public.wishlist_items (id) on delete cascade,
  price_id uuid not null references public.prices (id) on delete cascade,
  channel text not null check (channel in ('web_push', 'email')),
  sent_at timestamptz,
  created_at timestamptz not null default now()
);
create index alerts_user_id_idx on public.alerts (user_id);
create index alerts_wishlist_item_id_idx on public.alerts (wishlist_item_id);
create index alerts_price_id_idx on public.alerts (price_id);

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  endpoint text not null unique,
  p256dh text,
  auth_key text,
  created_at timestamptz not null default now()
);
create index push_subscriptions_user_id_idx on public.push_subscriptions (user_id);

create table public.feed_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  category text not null,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  unique (user_id, category)
);
create index feed_preferences_user_id_idx on public.feed_preferences (user_id);

-- ---------------------------------------------------------------------------
-- Discovery feed (F5)
-- ---------------------------------------------------------------------------
create table public.deal_feed_items (
  id uuid primary key default gen_random_uuid(),
  source text not null check (source in ('woot', 'dealnews', 'slickdeals')),
  -- Normalized dedupe key (R-14): source+external-id or a URL hash.
  dedupe_key text not null unique,
  title text not null,
  url text not null,
  store_slug text check (store_slug in ('best_buy', 'walmart', 'amazon', 'micro_center')),
  price numeric(10, 2),
  discount_percent numeric(5, 2),
  -- Trust Law #7: never overwritten with our own attribution.
  creator_attribution_url text,
  posted_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index deal_feed_items_posted_at_idx on public.deal_feed_items (posted_at);
create index deal_feed_items_source_idx on public.deal_feed_items (source);

-- ---------------------------------------------------------------------------
-- On-demand context check (F10)
-- ---------------------------------------------------------------------------
create table public.on_demand_checks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  item_ref text not null,
  supplied_price numeric(10, 2) not null,
  store_slug text not null check (store_slug in ('best_buy', 'walmart', 'amazon', 'micro_center')),
  result_type text not null check (result_type in ('verdict', 'context')),
  confidence text not null check (confidence in ('high', 'medium', 'low')),
  sources_used text[] not null default '{}',
  checked_at timestamptz not null default now()
);
create index on_demand_checks_user_id_idx on public.on_demand_checks (user_id);
create index on_demand_checks_checked_at_idx on public.on_demand_checks (checked_at);
