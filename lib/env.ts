/**
 * NEXT_PUBLIC_* must be read via static process.env.VAR references —
 * Next.js only inlines them for the browser bundle that way.
 */

export function getSupabaseUrl() {
  return (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').trim();
}

export function getSupabaseAnonKey() {
  return (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '').trim();
}

export function isUseSupabaseEnabled() {
  const v = (process.env.NEXT_PUBLIC_USE_SUPABASE ?? '').trim().toLowerCase();
  return v === 'true' || v === '1' || v === 'yes';
}

export function isSupabaseConfigured() {
  return Boolean(getSupabaseUrl() && getSupabaseAnonKey());
}

export function isRemoteDataEnabled() {
  return isUseSupabaseEnabled() && isSupabaseConfigured();
}

/** Auto push app → Supabase after edits (default: on when Supabase enabled) */
export function isAutoSyncEnabled() {
  const v = (process.env.NEXT_PUBLIC_SUPABASE_AUTO_SYNC ?? '').trim().toLowerCase();
  if (v === 'false' || v === '0' || v === 'no') return false;
  if (v === 'true' || v === '1' || v === 'yes') return isRemoteDataEnabled();
  return isRemoteDataEnabled();
}
