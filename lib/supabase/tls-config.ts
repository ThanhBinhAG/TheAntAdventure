/**
 * TLS policy for self-hosted company Supabase (no Node-only deps — safe for Edge middleware).
 */

import { getSupabaseUrl } from '@/lib/env';

const COMPANY_TLS_HOSTS = new Set(['sb.mitelai.com']);

function truthyEnv(v: string | undefined): boolean | null {
  const t = (v ?? '').trim().toLowerCase();
  if (t === 'true' || t === '1' || t === 'yes') return true;
  if (t === 'false' || t === '0' || t === 'no') return false;
  return null;
}

/** Explicit SUPABASE_TLS_INSECURE, or default on for company self-host host. */
export function isSupabaseTlsInsecureEnabled(): boolean {
  const flagged = truthyEnv(process.env.SUPABASE_TLS_INSECURE);
  if (flagged !== null) return flagged;
  try {
    const host = new URL(getSupabaseUrl()).hostname;
    return COMPANY_TLS_HOSTS.has(host);
  } catch {
    return false;
  }
}

export function shouldUseInsecureTlsForUrl(url: string): boolean {
  if (!isSupabaseTlsInsecureEnabled()) return false;
  try {
    const u = new URL(url);
    if (u.protocol !== 'https:') return false;
    if (COMPANY_TLS_HOSTS.has(u.hostname)) return true;
    return truthyEnv(process.env.SUPABASE_TLS_INSECURE) === true;
  } catch {
    return false;
  }
}
