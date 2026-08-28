import 'server-only';

import { createClient } from '@supabase/supabase-js';
import { getSupabaseAnonKey, getSupabaseUrl } from '@/lib/server/env/supabase';
import { getSupabaseGlobalFetchOptions } from '@/lib/supabase/insecure-fetch';

export function createSupabaseAuthClient() {
  const url = getSupabaseUrl();
  const key = getSupabaseAnonKey();
  if (!url || !key) throw new Error('Supabase Auth chưa được cấu hình ở phía server.');
  return createClient(url, key, {
    ...getSupabaseGlobalFetchOptions(),
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
