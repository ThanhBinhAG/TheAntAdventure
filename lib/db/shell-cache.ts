/**
 * @deprecated Use `route-cache.ts`. Thin wrappers for backward compatibility.
 */
import type { BackupData } from '../types';
import { SHELL_HYDRATE_TABLES } from './sync-config';
import {
  clearRouteCache,
  pickRouteSnapshot,
  readRouteCache,
  ROUTE_CACHE_TTL_MS,
  ROUTE_REVALIDATE_MIN_AGE_MS,
  shouldRevalidateCache,
  writeRouteCache,
  type RouteCachePayload,
} from './route-cache';

export const SHELL_CACHE_TTL_MS = ROUTE_CACHE_TTL_MS;
export { ROUTE_REVALIDATE_MIN_AGE_MS, shouldRevalidateCache };

export type ShellCachePayload = RouteCachePayload;

export function pickShellSnapshot(
  backup: BackupData,
  includeMessages: boolean
): Partial<BackupData> {
  return pickRouteSnapshot(backup, SHELL_HYDRATE_TABLES, includeMessages);
}

export const readShellCache = readRouteCache;

export function writeShellCache(data: Partial<BackupData>, messagesHydrated: boolean): void {
  writeRouteCache(data, SHELL_HYDRATE_TABLES, messagesHydrated);
}

export const clearShellCache = clearRouteCache;
