/**
 * NEXT_PUBLIC_* must be read via static process.env.VAR references —
 * Next.js only inlines them for the browser bundle that way.
 *
 * Supabase URL/keys come from `.env.local` only (see `.env.example`).
 * Do not commit real keys in source — use server env / CI secrets for deploy.
 */

export function getSupabaseUrl() {
  return (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').trim();
}

export function getSupabaseAnonKey() {
  return (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '').trim();
}

export function getServerSupabaseUrl() {
  return (process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').trim();
}

export function getServerSupabaseAnonKey() {
  return (process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '').trim();
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

export function getAuthCaptchaSiteKey() {
  return (process.env.NEXT_PUBLIC_AUTH_CAPTCHA_SITE_KEY ?? '').trim();
}

/** Auto push app → Supabase after edits (default: on when Supabase enabled) */
export function isAutoSyncEnabled() {
  const v = (process.env.NEXT_PUBLIC_SUPABASE_AUTO_SYNC ?? '').trim().toLowerCase();
  if (v === 'false' || v === '0' || v === 'no') return false;
  if (v === 'true' || v === '1' || v === 'yes') return isRemoteDataEnabled();
  return isRemoteDataEnabled();
}

/** Hydrate from Supabase but block all pushes (safe for dev against shared DB). */
export function isSupabaseReadOnly() {
  const v = (process.env.NEXT_PUBLIC_SUPABASE_READ_ONLY ?? '').trim().toLowerCase();
  return (
    isRemoteDataEnabled() &&
    (v === 'true' || v === '1' || v === 'yes')
  );
}

/** Server-only — never import from client components */
export function getSupabaseServiceRoleKey() {
  return (process.env.SUPABASE_SERVICE_ROLE_KEY ?? '').trim();
}

/** Server-only — protects POST /api/weather/refresh from crontab */
export function getWeatherCronSecret() {
  return (process.env.WEATHER_CRON_SECRET ?? '').trim();
}

/** Server-only — break-glass username (not an email; never expose to client) */
export function getBreakGlassUsername() {
  return (process.env.BREAK_GLASS_USERNAME ?? '').trim();
}

/** Server-only — break-glass password */
export function getBreakGlassPassword() {
  return (process.env.BREAK_GLASS_PASSWORD ?? '').trim();
}

/** Server-only — HMAC secret for bg_session cookie */
export function getBreakGlassSessionSecret() {
  return (process.env.BREAK_GLASS_SESSION_SECRET ?? '').trim();
}

export function isBreakGlassConfigured() {
  return Boolean(
    getBreakGlassUsername() && getBreakGlassPassword() && getBreakGlassSessionSecret(),
  );
}

/** Server-only — base URL for absolute asset links in PDF generation */
export function getAppUrl() {
  return (
    process.env.APP_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    'http://localhost:3006'
  ).trim();
}
