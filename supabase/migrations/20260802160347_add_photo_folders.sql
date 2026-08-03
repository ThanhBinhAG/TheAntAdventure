-- Photo Gallery folders (nested) + assign photos.folder_id
-- System inbox: PF-unsorted (existing photos migrate here).

create table if not exists public.photo_folders (
  id          text primary key,
  name        text not null,
  parent_id   text references public.photo_folders(id) on delete restrict,
  sort_order  smallint not null default 0,
  is_system   boolean not null default false,
  created_at  timestamptz not null default now()
);

create index if not exists idx_photo_folders_parent on public.photo_folders(parent_id);

grant all on public.photo_folders to anon;
grant all on public.photo_folders to authenticated;
grant all on public.photo_folders to service_role;

insert into public.photo_folders (id, name, parent_id, sort_order, is_system)
values ('PF-unsorted', 'Unsorted', null, 0, true)
on conflict (id) do nothing;

alter table public.photos
  add column if not exists folder_id text;

update public.photos
set folder_id = 'PF-unsorted'
where folder_id is null;

alter table public.photos
  alter column folder_id set default 'PF-unsorted';

alter table public.photos
  alter column folder_id set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'photos_folder_id_fkey'
  ) then
    alter table public.photos
      add constraint photos_folder_id_fkey
      foreign key (folder_id) references public.photo_folders(id) on delete restrict;
  end if;
end $$;

create index if not exists idx_photos_folder on public.photos(folder_id);

alter table public.photo_folders enable row level security;
drop policy if exists authenticated_access on public.photo_folders;
create policy authenticated_access on public.photo_folders
  for all to authenticated using (true) with check (true);
