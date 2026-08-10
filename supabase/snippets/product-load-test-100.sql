-- LOCAL TEST DATA ONLY: adds 100 synthetic catalogue products for pagination checks.
-- Safe to rerun: rows are identified exclusively by the LOADTEST- prefix.
begin;

insert into public.products (
  code, name, logic, duration, category, destination, level,
  description, usp, notes_to_sales, price_from, region
)
select
  format('LOADTEST-%s', lpad(n::text, 4, '0')),
  format('Load test product %s', n),
  'Synthetic pagination test data',
  case when n % 10 = 0 then 'Service' when n % 4 = 0 then 'Full Day' else 'Half Day' end,
  case when n % 10 = 0 then 'Service' when n % 3 = 0 then 'Cultural' else 'Adventure' end,
  case when n % 10 = 0 then 'All Vietnam' when n % 3 = 0 then 'Da Nang' when n % 3 = 1 then 'Hanoi' else 'Ho Chi Minh City' end,
  'Standard',
  format('Synthetic product %s. Used only to test server-side pagination.', n),
  'Load test only',
  'Delete with cleanup-product-load-test.sql after testing.',
  format('$%s/pax', 50 + (n % 10) * 10),
  case when n % 10 = 0 then 'services' when n % 3 = 0 then 'central' when n % 3 = 1 then 'north' else 'south' end
from generate_series(1, 100) as series(n)
on conflict (code) do update set
  name = excluded.name,
  logic = excluded.logic,
  duration = excluded.duration,
  category = excluded.category,
  destination = excluded.destination,
  level = excluded.level,
  description = excluded.description,
  usp = excluded.usp,
  notes_to_sales = excluded.notes_to_sales,
  price_from = excluded.price_from,
  region = excluded.region;

insert into public.product_pricing (product_code, std_cost, p1, p2, c1, c2)
select
  format('LOADTEST-%s', lpad(n::text, 4, '0')),
  20 + (n % 10) * 5,
  50 + (n % 10) * 10,
  50 + (n % 10) * 10,
  20 + (n % 10) * 5,
  20 + (n % 10) * 5
from generate_series(1, 100) as series(n)
on conflict (product_code) do update set
  std_cost = excluded.std_cost,
  p1 = excluded.p1,
  p2 = excluded.p2,
  c1 = excluded.c1,
  c2 = excluded.c2;

commit;
