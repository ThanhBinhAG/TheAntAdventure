-- Optional customer deal economics (USD), entered on Clients form.
alter table public.customers
  add column if not exists revenue numeric,
  add column if not exists cost numeric,
  add column if not exists profit numeric;
