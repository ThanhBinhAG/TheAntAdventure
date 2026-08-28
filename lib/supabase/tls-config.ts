/**
 * TLS policy for self-hosted company Supabase (no Node-only deps — safe for Edge middleware).
 */

import { getSupabaseUrl } from '@/lib/server/env/supabase';

function truthyEnv(v: string | undefined): boolean | null {
  const t = (v ?? '').trim().toLowerCase();
  if (t === 'true' || t === '1' || t === 'yes') return true;
  if (t === 'false' || t === '0' || t === 'no') return false;
  return null;
}

/**
 * Development-only escape hatch for a local self-signed Supabase instance.
 * Production must fail closed so JWKS and service-role traffic retain TLS
 * authenticity.
 */
export function isSupabaseTlsInsecureEnabled(): boolean {
  return process.env.NODE_ENV === 'development'
    && truthyEnv(process.env.SUPABASE_TLS_INSECURE) === true;
}

export function shouldUseInsecureTlsForUrl(url: string): boolean {
  if (!isSupabaseTlsInsecureEnabled()) return false;
  try {
    const target = new URL(url);
    const configured = new URL(getSupabaseUrl());
    return target.protocol === 'https:' && target.origin === configured.origin;
  } catch {
    return false;
  }
}
