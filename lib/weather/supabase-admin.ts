import 'server-only';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseServiceRoleKey, getSupabaseUrl } from '@/lib/env';
import { getSupabaseGlobalFetchOptions } from '@/lib/supabase/insecure-fetch';

let adminClient: SupabaseClient | null = null;

export function getWeatherAdminClient(): SupabaseClient | null {
  const url = getSupabaseUrl();
  const key = getSupabaseServiceRoleKey();
  if (!url || !key) return null;

  if (!adminClient) {
    adminClient = createClient(url, key, {
      ...getSupabaseGlobalFetchOptions(),
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return adminClient;
}
