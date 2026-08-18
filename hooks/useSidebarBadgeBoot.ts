'use client';

import { useEffect, useMemo, useSyncExternalStore } from 'react';
import { ensureTablesLoaded, getHydrationState, subscribeHydration } from '@/lib/db/hydrate';
import { sidebarBadgeTablesForPermissions } from '@/lib/db/sidebar-badge-tables';
import type { SyncArrayTable } from '@/lib/db/sync-config';
import type { HydrationState } from '@/lib/db/sync-lifecycle';

function badgesHydrated(state: HydrationState, tables: readonly SyncArrayTable[]): boolean {
  return tables.length === 0 || tables.every((t) => state.hydratedTables.includes(t));
}

/** Hydrate sidebar badge tables on any CRM route (scoped by permissions). */
export function useSidebarBadgeBoot(permissionCodes: ReadonlySet<string>): void {
  const tables = useMemo(
    () => sidebarBadgeTablesForPermissions(permissionCodes),
    [permissionCodes]
  );
  const hydration = useSyncExternalStore(subscribeHydration, getHydrationState, getHydrationState);
  const hydrated = badgesHydrated(hydration, tables);
  const tableKey = tables.join(',');

  useEffect(() => {
    if (!tables.length || hydrated) return;
    void ensureTablesLoaded(tables);
  }, [tables, hydrated, tableKey]);
}
