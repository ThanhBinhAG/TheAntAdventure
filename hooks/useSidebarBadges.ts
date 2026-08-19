'use client';

import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { getHydrationState, subscribeHydration } from '@/lib/db/hydrate';
import { sidebarBadgeTablesForPermissions } from '@/lib/db/sidebar-badge-tables';
import { countActiveTasks } from '@/lib/planner/planner-task-utils';
import { countTourDesignAttention } from '@/lib/tour-design/tour-design-leads';
import type { Lead, Task, TourDraft } from '@/lib/types';
import { useStore } from '@/hooks/useStore';

export type SidebarBadgeSnapshot = {
  tourDesignAttention: number;
  activeTasks: number;
};

type ApiBadgeCounts = {
  tourDesignAttention?: number;
  activeTasks?: number;
};

let badgeInflight: Promise<ApiBadgeCounts> | null = null;

function badgesHydrated(hydratedTables: readonly string[], tables: readonly string[]): boolean {
  return tables.length === 0 || tables.every((t) => hydratedTables.includes(t));
}

async function fetchSidebarBadgeCounts(): Promise<ApiBadgeCounts> {
  if (badgeInflight) return badgeInflight;

  badgeInflight = (async () => {
    const res = await fetch('/api/sidebar/badges', { cache: 'no-store' });
    const json = (await res.json()) as ApiBadgeCounts & { error?: string };
    if (!res.ok) throw new Error(json.error || `Badge fetch failed (${res.status})`);
    return json;
  })().finally(() => {
    badgeInflight = null;
  });

  return badgeInflight;
}

function scheduleIdleWork(run: () => void): () => void {
  let idleId: number | undefined;
  let timerId: number | undefined;

  if (typeof requestIdleCallback !== 'undefined') {
    idleId = requestIdleCallback(run, { timeout: 3000 });
  } else {
    timerId = window.setTimeout(run, 1200);
  }

  return () => {
    if (idleId !== undefined && typeof cancelIdleCallback !== 'undefined') {
      cancelIdleCallback(idleId);
    }
    if (timerId !== undefined) window.clearTimeout(timerId);
  };
}

/**
 * Sidebar badge counts: from Zustand when badge tables are hydrated,
 * otherwise a deferred count-only API (no full-table GET).
 */
export function useSidebarBadges(permissionCodes: ReadonlySet<string>): SidebarBadgeSnapshot {
  const tables = useMemo(
    () => sidebarBadgeTablesForPermissions(permissionCodes),
    [permissionCodes]
  );
  const tableKey = tables.join(',');
  const hydration = useSyncExternalStore(subscribeHydration, getHydrationState, getHydrationState);
  const storeHydrated = badgesHydrated(hydration.hydratedTables, tables);
  const isHydrationReady = hydration.phase === 'ready';

  const leads = useStore((s) => s.leads) as Lead[];
  const tourDrafts = useStore((s) => s.tourDrafts) as TourDraft[];
  const tasks = useStore((s) => s.tasks) as Task[];

  const storeCounts = useMemo(
    () => ({
      tourDesignAttention: countTourDesignAttention(leads, tourDrafts),
      activeTasks: countActiveTasks(tasks),
    }),
    [leads, tourDrafts, tasks]
  );

  const [apiCounts, setApiCounts] = useState<ApiBadgeCounts | null>(null);

  useEffect(() => {
    if (!tables.length || storeHydrated || !isHydrationReady) return;

    let cancelled = false;
    const cancelIdle = scheduleIdleWork(() => {
      void (async () => {
        try {
          const counts = await fetchSidebarBadgeCounts();
          if (!cancelled) setApiCounts(counts);
        } catch {
          if (!cancelled) setApiCounts(null);
        }
      })();
    });

    return () => {
      cancelled = true;
      cancelIdle();
    };
  }, [tables, storeHydrated, tableKey, isHydrationReady]);

  if (storeHydrated) {
    return storeCounts;
  }

  if (!isHydrationReady) {
    // While hydration is still pending, avoid extra badge API overlap.
    return { tourDesignAttention: 0, activeTasks: 0 };
  }

  return {
    tourDesignAttention: apiCounts?.tourDesignAttention ?? 0,
    activeTasks: apiCounts?.activeTasks ?? 0,
  };
}
