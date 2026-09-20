-- Seed the fixed store roster (Store roles fixed, C-P3): Best Buy + Walmart are
-- price-tracked; Amazon + Micro Center are awareness-only.
insert into public.store_retailers (slug, name, role) values
  ('best_buy', 'Best Buy', 'tracked'),
  ('walmart', 'Walmart', 'tracked'),
  ('amazon', 'Amazon', 'awareness'),
  ('micro_center', 'Micro Center', 'awareness')
on conflict (slug) do nothing;
