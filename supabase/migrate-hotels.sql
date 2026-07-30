-- Hotels module migration
-- Run after schema.sql (hotels + hotel_rooms tables).
-- App seeds AA_HOTELS via lib/ensure-supplier-seeds.ts on first hydrate when DB is empty.
-- Push snapshot from CRM UI to persist hotels + room rates to Supabase.

-- Optional: verify tables exist
-- select count(*) from hotels;
-- select count(*) from hotel_rooms;
