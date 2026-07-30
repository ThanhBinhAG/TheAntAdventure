-- Incremental migration: Outline export columns + sent status
-- Run on existing DB without full reset.

alter table tour_outline_days add column if not exists location text;
alter table tour_outline_days add column if not exists hotels text;

alter table tour_drafts drop constraint if exists chk_outline_status;
alter table tour_drafts add constraint chk_outline_status
  check (outline_status in ('draft', 'sent', 'approved'));
