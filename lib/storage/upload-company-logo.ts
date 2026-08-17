import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  companyLogoObjectPathFromUrl,
  companyLogoPath,
  LEGACY_COMPANY_LOGO_PATH,
  PHOTOS_BUCKET,
} from '@/lib/storage/photo-paths';

const BRANDING_ID = 'default';

async function readCurrentLogoUrl(supabase: SupabaseClient): Promise<string | null> {
  const { data, error } = await supabase
    .from('company_branding')
    .select('logo_url')
    .eq('id', BRANDING_ID)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data?.logo_url ?? null;
}

async function removeLogoObjects(supabase: SupabaseClient, paths: string[]): Promise<void> {
  const unique = [...new Set(paths.filter(Boolean))];
  if (!unique.length) return;
  await supabase.storage.from(PHOTOS_BUCKET).remove(unique);
}

export async function uploadCompanyLogo(
  supabase: SupabaseClient,
  buffer: Buffer,
): Promise<string> {
  const previousUrl = await readCurrentLogoUrl(supabase);
  const version = String(Date.now());
  const path = companyLogoPath(version);

  const { error } = await supabase.storage.from(PHOTOS_BUCKET).upload(path, buffer, {
    contentType: 'image/webp',
    upsert: false,
    cacheControl: '0',
  });
  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from(PHOTOS_BUCKET).getPublicUrl(path);
  const logoUrl = `${data.publicUrl}?v=${version}`;

  const { error: dbError } = await supabase.from('company_branding').upsert(
    { id: BRANDING_ID, logo_url: logoUrl, updated_at: new Date().toISOString() },
    { onConflict: 'id' }
  );
  if (dbError) {
    await supabase.storage.from(PHOTOS_BUCKET).remove([path]);
    throw new Error(dbError.message);
  }

  const stale = [
    companyLogoObjectPathFromUrl(previousUrl),
    LEGACY_COMPANY_LOGO_PATH,
  ].filter((p): p is string => Boolean(p) && p !== path);
  await removeLogoObjects(supabase, stale);

  return logoUrl;
}

export async function clearCompanyLogo(supabase: SupabaseClient): Promise<void> {
  const previousUrl = await readCurrentLogoUrl(supabase);
  const paths = [
    companyLogoObjectPathFromUrl(previousUrl),
    LEGACY_COMPANY_LOGO_PATH,
  ].filter((p): p is string => Boolean(p));
  await removeLogoObjects(supabase, paths);

  const { error } = await supabase
    .from('company_branding')
    .upsert(
      { id: BRANDING_ID, logo_url: null, updated_at: new Date().toISOString() },
      { onConflict: 'id' }
    );
  if (error) throw new Error(error.message);
}

export async function fetchCompanyLogoUrl(supabase: SupabaseClient): Promise<string | null> {
  return readCurrentLogoUrl(supabase);
}
