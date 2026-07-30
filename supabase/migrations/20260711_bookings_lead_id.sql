-- Link Confirmed pipeline leads to Operations bookings (idempotent auto-booking).
-- Safe to re-run.

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS lead_id text;

CREATE UNIQUE INDEX IF NOT EXISTS bookings_lead_id_unique
  ON bookings (lead_id)
  WHERE lead_id IS NOT NULL;
