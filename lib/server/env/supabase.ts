import 'server-only';

function read(name: string): string {
  return (process.env[name] ?? '').trim();
}

export function getSupabaseUrl() { return read('SUPABASE_URL'); }
export function getSupabaseAnonKey() { return read('SUPABASE_ANON_KEY'); }
export function getSupabaseServiceRoleKey() { return read('SUPABASE_SERVICE_ROLE_KEY'); }
export function getSupabaseJwtIssuer() { return read('SUPABASE_JWT_ISSUER'); }
export function getSupabaseJwksUrl() { return read('SUPABASE_JWKS_URL'); }
export function isSupabaseConfigured() { return Boolean(getSupabaseUrl() && getSupabaseAnonKey()); }
