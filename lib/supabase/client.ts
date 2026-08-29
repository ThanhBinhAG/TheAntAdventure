import { createBrowserClient } from '@supabase/ssr';
import { getSupabaseAnonKey, getSupabaseUrl } from '@/lib/env';

export function createClient() {
  const url = getSupabaseUrl();
  const key = getSupabaseAnonKey();
  if (!url || !key) {
    throw new Error('Browser Supabase configuration is unavailable. Use the CRM BFF instead.');
  }
  return createBrowserClient(url, key);
}
