import 'server-only';

import { createClient } from '@supabase/supabase-js';
import { getSupabaseAnonKey, getSupabaseUrl } from '@/lib/server/env/supabase';
import {
  getCachedAuthzState,
  setCachedAuthzState,
  type CachedAuthzState,
} from '@/lib/redis/authz-state';
import { getSupabaseGlobalFetchOptions } from '@/lib/supabase/insecure-fetch';

export type AuthzState = CachedAuthzState;

export type AuthzStateResolution =
  | { status: 'active'; state: AuthzState }
  | { status: 'inactive'; state: AuthzState }
  | { status: 'unavailable' };

function resolveState(state: AuthzState): AuthzStateResolution {
  return state.isActive ? { status: 'active', state } : { status: 'inactive', state };
}

/**
 * Check the user's own profile only on a Redis miss. An unavailable Authz
 * lookup must not be treated as a disabled account or an expired JWT.
 */
export async function getCurrentAuthzStateResult(input: {
  userId: string;
  accessToken: string;
}): Promise<AuthzStateResolution> {
  const cached = await getCachedAuthzState(input.userId);
  if (cached) return resolveState(cached);

  const url = getSupabaseUrl();
  const key = getSupabaseAnonKey();
  if (!url || !key) return { status: 'unavailable' };

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
    if (error) return { status: 'unavailable' };
    if (!data || typeof data.is_active !== 'boolean') return { status: 'inactive', state: { isActive: false, version: 1 } };

    const state: AuthzState = {
      isActive: data.is_active,
      version: Number.isFinite(Number(data.authz_version)) ? Number(data.authz_version) : 1,
    };
    await setCachedAuthzState(input.userId, state);
    return resolveState(state);
  } catch {
    return { status: 'unavailable' };
  }
}

/** Backward-compatible helper for callers that only need resolved account state. */
export async function getCurrentAuthzState(input: {
  userId: string;
  accessToken: string;
}): Promise<AuthzState | null> {
  const result = await getCurrentAuthzStateResult(input);
  return result.status === 'unavailable' ? null : result.state;
}
