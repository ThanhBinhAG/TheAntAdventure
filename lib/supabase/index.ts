import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseAnonKey, getSupabaseUrl } from '../env';
import { createClient } from './client';

export { isSupabaseConfigured } from '../env';

let supabase: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  const url = getSupabaseUrl();
  const key = getSupabaseAnonKey();
  if (!url || !key) return null;

  if (!supabase) {
    supabase = createClient();
  }
  return supabase;
}
