/**
 * NEXT_PUBLIC_* must be read via static process.env.VAR references —
 * Next.js only inlines them for the browser bundle that way.
 *
 * Self-host only: if env still has localhost / empty Supabase URL, fall back
 * to company defaults (also applied at startup via next.config.mjs →
 * env/sanitize-supabase-env.mjs).
 *
 * PRODUCTION_DEFAULTS below mirrors env/company.defaults.env — keep in sync
 * when rotating URL/keys. Prefer editing company.defaults.env first (sanitize
 * source of truth); then update this mirror for runtime getters / browser.
 */

const PRODUCTION_DEFAULTS = {
  url: 'https://sb.mitelai.com:9001',
  anonKey: 'sb_publishable_ZaiYXiw9LBetFyrpiP4R0Q_jDocbYJq',
  serviceRoleKey:
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3ODEwODE1NDgsImV4cCI6MTkzODc2MTU0OH0.yDrGPG3eScuJe15GPVPZhoO3DXIRoQasPIerciT-Fmk',
  appUrl: 'https://theantcrmdemo.mitelai.com/',
};

function isLocalSupabaseUrl(url: string): boolean {
  return /127\.0\.0\.1|localhost/i.test(url);
}

function isLocalSupabaseAllowed(): boolean {
  const value = (process.env.NEXT_PUBLIC_ALLOW_LOCAL_SUPABASE ?? '').trim().toLowerCase();
  return value === 'true' || value === '1' || value === 'yes';
}

function shouldUseProductionDefaults(): boolean {
  const envUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').trim();

  return !envUrl || (
    isLocalSupabaseUrl(envUrl) &&
    !isLocalSupabaseAllowed()
  );
}

function resolveSupabaseString(raw: string | undefined, fallback: string): string {
  const trimmed = (raw ?? '').trim();
  if (shouldUseProductionDefaults()) return fallback;
  return trimmed || fallback;
}

export function getSupabaseUrl() {
  return resolveSupabaseString(process.env.NEXT_PUBLIC_SUPABASE_URL, PRODUCTION_DEFAULTS.url);
}

export function getSupabaseAnonKey() {
  return resolveSupabaseString(
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    PRODUCTION_DEFAULTS.anonKey,
  );
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
  return resolveSupabaseString(
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    PRODUCTION_DEFAULTS.serviceRoleKey,
  );
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
  const raw = (process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? '').trim();
  // When forcing company Supabase from a leftover localhost URL, also fix APP_URL.
  if (shouldUseProductionDefaults()) {
    return PRODUCTION_DEFAULTS.appUrl;
  }
  return raw || 'http://localhost:3006';
}
