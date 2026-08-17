import type { PageSlug } from '../../types';
import {
  pickRouteSnapshot,
  readRouteCache,
  resolveRouteCacheTables,
  writeRouteCache,
} from '../route-cache';
import { getHydratedTables } from '../sync-lifecycle';
import { useStore } from '../../store';

export function persistRouteCache(slug?: PageSlug): void {
  const existing = readRouteCache();
  const effectiveSlug = slug ?? existing?.lastSlug;
  // Without a route slug, do not expand cache to the union of all hydrated tables.
  if (!effectiveSlug) return;

  const hydrated = getHydratedTables();
  const tables = resolveRouteCacheTables(effectiveSlug, hydrated);
  const backup = useStore.getState().exportBackup();
  writeRouteCache(
    pickRouteSnapshot(backup, tables, false),
    tables,
    false,
    effectiveSlug
  );
}

/** After local mutations, refresh session route cache so F5 does not restore stale empty slices. */
export function persistRouteCacheFromStore(slug?: PageSlug): void {
  persistRouteCache(slug);
}
