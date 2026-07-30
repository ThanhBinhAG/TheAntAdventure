-- Photo Gallery pairs migration (existing Supabase projects)
-- Run in SQL Editor after photos table exists.

-- ============================================================
-- 1. Extend photos table
-- ============================================================

alter table photos add column if not exists slot smallint check (slot is null or slot in (1, 2));
alter table photos add column if not exists display_bytes integer;

create unique index if not exists photos_product_slot_unique
  on photos (product_code, slot)
  where product_code is not null and slot is not null;

-- ============================================================
-- 2. Backfill slots for existing product-linked photos
--    First photo per product → slot 1, second → slot 2
-- ============================================================

with ranked as (
  select
    id,
    row_number() over (partition by product_code order by id) as rn
  from photos
  where product_code is not null
    and slot is null
)
update photos p
set slot = ranked.rn::smallint
from ranked
where p.id = ranked.id
  and ranked.rn in (1, 2);
