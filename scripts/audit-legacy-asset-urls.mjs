#!/usr/bin/env node
/**
 * Dev diagnostic: list SQL patterns to find legacy asset URLs in the database.
 * Does not connect to DB — prints suggested queries for local psql/Supabase SQL editor.
 *
 * Usage: node scripts/audit-legacy-asset-urls.mjs
 */
console.log(`-- Legacy asset URL audit (run against your CRM database)

select 'photos.url' as source, id, url
from public.photos
where url ~ '/storage/v1/|\\.supabase\\.co/'
limit 20;

select 'photos.thumb_url' as source, id, thumb_url
from public.photos
where thumb_url ~ '/storage/v1/|\\.supabase\\.co/'
limit 20;

select 'company_branding.logo_url' as source, id, logo_url
from public.company_branding
where logo_url ~ '/storage/v1/|\\.supabase\\.co/'
limit 20;

select 'guides.photo_url' as source, id, photo_url
from public.guides
where photo_url ~ '/storage/v1/|\\.supabase\\.co/'
   or (photo_url ~ '^guides/' and photo_url !~ '^/api/')
limit 20;
`);
