-- Photo Gallery asset pipeline (parallel module, see lib/photo-gallery/).
-- One row per uploaded source image; up to three WebP variants live under the
-- `photo-gallery/{id}/` prefix in the shared `photos` Storage bucket.
-- Independent from the legacy `photos` table, which keeps its own display+thumb flow.

create table if not exists public.photo_gallery_assets (
  id              text primary key,
  caption         text,
  region          text,
  folder_id       text references public.photo_folders(id) on delete set null,
  original_name   text,
  size_profile    text not null check (size_profile in ('small', 'standard', 'large')),
  source_bytes    bigint not null check (source_bytes > 0),
  thumb_url       text,
  medium_url      text,                          -- null for the `small` profile
  original_url    text not null,
  storage_prefix  text not null unique,          -- photo-gallery/{id}
  width           integer,
  height          integer,
  created_at      timestamptz not null default now()
);

create index if not exists idx_pga_created on public.photo_gallery_assets(created_at desc);
create index if not exists idx_pga_folder on public.photo_gallery_assets(folder_id);

grant all on public.photo_gallery_assets to authenticated;
grant all on public.photo_gallery_assets to service_role;

alter table public.photo_gallery_assets enable row level security;
drop policy if exists authenticated_access on public.photo_gallery_assets;
create policy authenticated_access on public.photo_gallery_assets
  for all to authenticated using (true) with check (true);
