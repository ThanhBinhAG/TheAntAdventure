-- Weather forecast cache (weekly live + snapshot)
-- Run in Supabase SQL Editor after schema.sql or on existing v5 DB.

-- ============================================================
--  MODULE · WEATHER (live weekly forecast cache)
-- ============================================================

create table if not exists weather_destinations (
  id              text primary key,
  name            text        not null,
  region          text        not null check (region in ('north', 'central', 'south')),
  emoji           text,
  latitude        numeric(9,6) not null,
  longitude       numeric(9,6) not null,
  elevation_m     int,
  sort_order      int         default 0,
  active          boolean     default true,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

create table if not exists weather_forecast_cache (
  id              bigserial primary key,
  destination_id  text        not null references weather_destinations(id) on delete cascade,
  forecast_date   date        not null,
  temp_min_c      numeric(5,1) not null,
  temp_max_c      numeric(5,1) not null,
  precip_mm       numeric(6,1) default 0,
  wind_kmh        numeric(6,1),
  weather_code    int         not null,
  travel_rating   text        not null check (travel_rating in ('E', 'G', 'F', 'P')),
  fetched_at      timestamptz not null,
  expires_at      timestamptz not null,
  unique (destination_id, forecast_date)
);

create table if not exists weather_fetch_log (
  id                  bigserial primary key,
  fetched_at          timestamptz default now(),
  status              text        not null check (status in ('ok', 'error', 'skipped')),
  destinations_count  int         default 0,
  duration_ms         int,
  error_message       text
);

create index if not exists idx_weather_cache_dest on weather_forecast_cache(destination_id);
create index if not exists idx_weather_cache_date on weather_forecast_cache(forecast_date);
create index if not exists idx_weather_cache_expires on weather_forecast_cache(expires_at);
create index if not exists idx_weather_fetch_log_at on weather_fetch_log(fetched_at desc);

-- RLS (dev)
alter table weather_destinations enable row level security;
alter table weather_forecast_cache enable row level security;
alter table weather_fetch_log enable row level security;

drop policy if exists dev_allow_all on weather_destinations;
create policy dev_allow_all on weather_destinations for all using (true) with check (true);

drop policy if exists dev_allow_all on weather_forecast_cache;
create policy dev_allow_all on weather_forecast_cache for all using (true) with check (true);

drop policy if exists dev_allow_all on weather_fetch_log;
create policy dev_allow_all on weather_fetch_log for all using (true) with check (true);

-- Seed destinations (14 Vietnam locations)
insert into weather_destinations (id, name, region, emoji, latitude, longitude, elevation_m, sort_order) values
  ('hanoi',     'Hanoi',          'north',   '🏛', 21.0285, 105.8542, null,  1),
  ('sapa',      'Sapa',           'north',   '⛰', 22.3364, 103.8438, 1500,  2),
  ('maichau',   'Mai Chau',       'north',   '🌾', 20.6797, 105.0883, 400,   3),
  ('ninhbinh',  'Ninh Binh',      'north',   '🛶', 20.2506, 105.9745, null,  4),
  ('phongnha',  'Phong Nha',      'central', '🦇', 17.5900, 106.2830, null,  5),
  ('hue',       'Hue',            'central', '🏯', 16.4637, 107.5909, null,  6),
  ('danang',    'Da Nang',        'central', '🌉', 16.0544, 108.2022, null,  7),
  ('hoian',     'Hoi An',         'central', '🏮', 15.8801, 108.3380, null,  8),
  ('nhatrang',  'Nha Trang',      'central', '🤿', 12.2388, 109.1967, null,  9),
  ('phanthiet', 'Phan Thiet',     'south',   '🏄', 10.9289, 108.1021, null, 10),
  ('condao',    'Con Dao',        'south',   '🐢',  8.6864, 106.6074, null, 11),
  ('phuquoc',   'Phu Quoc',       'south',   '🏝', 10.2899, 103.9840, null, 12),
  ('saigon',    'Saigon (HCMC)',  'south',   '🌆', 10.8231, 106.6297, null, 13),
  ('mekong',    'Mekong Delta',   'south',   '🚣', 10.0452, 105.7469, null, 14)
on conflict (id) do update set
  name = excluded.name,
  region = excluded.region,
  emoji = excluded.emoji,
  latitude = excluded.latitude,
  longitude = excluded.longitude,
  elevation_m = excluded.elevation_m,
  sort_order = excluded.sort_order,
  updated_at = now();
