import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseAnonKey, getSupabaseUrl } from './env';

export { isSupabaseConfigured } from './env';

let supabase: SupabaseClient | null = null;
let clientKey = '';

export function getSupabaseClient(): SupabaseClient | null {
  const url = getSupabaseUrl();
  const key = getSupabaseAnonKey();
  if (!url || !key) return null;

  const cacheKey = `${url}|${key.slice(0, 12)}`;
  if (!supabase || clientKey !== cacheKey) {
    supabase = createClient(url, key);
    clientKey = cacheKey;
  }
  return supabase;
}
