-- Outline workflow metadata on tour_drafts
alter table tour_drafts add column if not exists outline_notes text;
alter table tour_drafts add column if not exists outline_sent_at timestamptz;
alter table tour_drafts add column if not exists outline_approved_at timestamptz;
alter table tour_drafts add column if not exists outline_revision smallint default 0;
