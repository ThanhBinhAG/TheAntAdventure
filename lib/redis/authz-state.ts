import 'server-only';

import { cacheDel, cacheGet, cacheSet } from '@/lib/redis/cache-helper';

const AUTHZ_STATE_TTL_SECONDS = 5 * 60;

export type CachedAuthzState = {
  isActive: boolean;
  version: number;
};

function authzStateKey(userId: string): string {
  return `authz:user:${userId}`;
}

export function getCachedAuthzState(userId: string): Promise<CachedAuthzState | null> {
  return cacheGet<CachedAuthzState>(authzStateKey(userId));
}

export function setCachedAuthzState(userId: string, state: CachedAuthzState): Promise<boolean> {
  return cacheSet(authzStateKey(userId), state, AUTHZ_STATE_TTL_SECONDS);
}

export function invalidateCachedAuthzState(userId: string): Promise<boolean> {
  return cacheDel(authzStateKey(userId));
}
