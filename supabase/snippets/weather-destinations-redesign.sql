-- Weather Guide redesign — run once in Supabase SQL Editor
-- Fixes: weather_current_cache missing + cover_photo_id / is_featured columns

alter table weather_destinations
  add column if not exists description text,
  add column if not exists notes text,
  add column if not exists cover_photo_id text references photos(id) on delete set null,
  add column if not exists is_featured boolean not null default false;

create index if not exists idx_weather_dest_featured
  on weather_destinations (is_featured)
  where active = true;

create index if not exists idx_weather_dest_cover
  on weather_destinations (cover_photo_id)
  where cover_photo_id is not null;

update weather_destinations
set is_featured = true
where id in ('hanoi', 'saigon');

create table if not exists weather_current_cache (
  destination_id text primary key references weather_destinations(id) on delete cascade,
  payload        jsonb        not null,
  fetched_at     timestamptz  not null,
  expires_at     timestamptz  not null
);

create index if not exists idx_weather_current_expires
  on weather_current_cache (expires_at);

-- Optional: mark this migration as applied if you use `supabase migration list`
-- insert into supabase_migrations.schema_migrations (version)
-- values ('20260804141500')
-- on conflict do nothing;
