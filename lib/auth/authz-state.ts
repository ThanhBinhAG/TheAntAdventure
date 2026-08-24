import 'server-only';

import { createClient } from '@supabase/supabase-js';
import { getServerSupabaseAnonKey, getServerSupabaseUrl } from '@/lib/env';
import {
  getCachedAuthzState,
  setCachedAuthzState,
  type CachedAuthzState,
} from '@/lib/redis/authz-state';
import { getSupabaseGlobalFetchOptions } from '@/lib/supabase/insecure-fetch';

export type AuthzState = CachedAuthzState;

/**
 * Check the user's own profile only on a Redis miss. Account status remains
 * server-authoritative without putting permissions or active state in JWTs.
 */
export async function getCurrentAuthzState(input: {
  userId: string;
  accessToken: string;
}): Promise<AuthzState | null> {
  const cached = await getCachedAuthzState(input.userId);
  if (cached) return cached;

  const url = getServerSupabaseUrl();
  const key = getServerSupabaseAnonKey();
  if (!url || !key) return null;

  try {
    const supabase = createClient(url, key, {
      ...getSupabaseGlobalFetchOptions(),
      accessToken: async () => input.accessToken,
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await supabase
      .from('profiles')
      .select('is_active, authz_version')
      .eq('id', input.userId)
      .maybeSingle();
    if (error || !data || typeof data.is_active !== 'boolean') return null;

    const state: AuthzState = {
      isActive: data.is_active,
      version: Number.isFinite(Number(data.authz_version)) ? Number(data.authz_version) : 1,
    };
    await setCachedAuthzState(input.userId, state);
    return state;
  } catch {
    return null;
  }
}
