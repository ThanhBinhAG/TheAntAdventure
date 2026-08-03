import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { companyLogoPath, PHOTOS_BUCKET } from '@/lib/storage/photo-paths';

const BRANDING_ID = 'default';

export async function uploadCompanyLogo(
  supabase: SupabaseClient,
  buffer: Buffer,
): Promise<string> {
  const path = companyLogoPath();
  const { error } = await supabase.storage.from(PHOTOS_BUCKET).upload(path, buffer, {
    contentType: 'image/webp',
    upsert: true,
  });
  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from(PHOTOS_BUCKET).getPublicUrl(path);
  const logoUrl = `${data.publicUrl}?v=${Date.now()}`;

  const { error: dbError } = await supabase.from('company_branding').upsert(
    { id: BRANDING_ID, logo_url: logoUrl, updated_at: new Date().toISOString() },
    { onConflict: 'id' }
  );
  if (dbError) throw new Error(dbError.message);

  return logoUrl;
}

export async function clearCompanyLogo(supabase: SupabaseClient): Promise<void> {
  const path = companyLogoPath();
  await supabase.storage.from(PHOTOS_BUCKET).remove([path]);
  const { error } = await supabase
    .from('company_branding')
    .upsert(
      { id: BRANDING_ID, logo_url: null, updated_at: new Date().toISOString() },
      { onConflict: 'id' }
    );
  if (error) throw new Error(error.message);
}

export async function fetchCompanyLogoUrl(supabase: SupabaseClient): Promise<string | null> {
  const { data, error } = await supabase
    .from('company_branding')
    .select('logo_url')
    .eq('id', BRANDING_ID)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data?.logo_url ?? null;
}
