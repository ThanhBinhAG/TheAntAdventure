-- D2.14: Backfill legacy public Storage URLs to CRM-origin paths / routes.

-- Gallery: extend storage_path backfill beyond gallery/-only rows.
update public.photos
set storage_path = coalesce(
  storage_path,
  (regexp_match(url, '/storage/v1/object/public/photos/([^?]+)'))[1],
  (regexp_match(thumb_url, '/storage/v1/object/public/photos/([^?]+)'))[1]
)
where storage_path is null
  and (
    url ~ '/storage/v1/object/public/photos/'
    or thumb_url ~ '/storage/v1/object/public/photos/'
  );

-- Company branding: legacy public URLs -> CRM file route.
update public.company_branding
set logo_url = '/api/branding/logo/file?v=' || (regexp_match(logo_url, 'logo-([0-9]+)\.webp'))[1]
where logo_url ~ '/storage/v1/.*branding/logo-[0-9]+\.webp'
   or logo_url ~ '\.supabase\.co/storage/v1/.*branding/logo-[0-9]+\.webp';

update public.company_branding
set logo_url = '/api/branding/logo/file'
where logo_url ~ '/storage/v1/.*branding/logo\.webp'
   or logo_url ~ '\.supabase\.co/storage/v1/.*branding/logo\.webp';

-- Guides: legacy Storage avatar URLs -> CRM avatar proxy route.
update public.guides
set photo_url = '/api/guides/avatar?guideId=' || id
where photo_url is not null
  and photo_url <> ''
  and photo_url !~ '^/api/guides/avatar'
  and (
    photo_url ~ '/storage/v1/object/(public|sign)/photos/guides/'
    or photo_url ~ '\.supabase\.co/storage/v1/.*guides/'
    or photo_url ~ '^guides/[^/]+/avatar\.webp$'
  );
