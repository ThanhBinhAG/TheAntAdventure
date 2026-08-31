'use client';

import { useEffect, useMemo, useState } from 'react';
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
 * Sidebar badge counts from Zustand when CRM rows are already mirrored locally,
 * otherwise a deferred count-only API (no full-table GET).
 */
export function useSidebarBadges(permissionCodes: ReadonlySet<string>): SidebarBadgeSnapshot {
  const tables = useMemo(
    () => sidebarBadgeTablesForPermissions(permissionCodes),
    [permissionCodes],
  );
  const tableKey = tables.join(',');

  const leads = useStore((s) => s.leads) as Lead[];
  const tourDrafts = useStore((s) => s.tourDrafts) as TourDraft[];
  const tasks = useStore((s) => s.tasks) as Task[];

  const storeCounts = useMemo(
    () => ({
      tourDesignAttention: countTourDesignAttention(leads, tourDrafts),
      activeTasks: countActiveTasks(tasks),
    }),
    [leads, tourDrafts, tasks],
  );

  const storeHasBadgeData =
    leads.length > 0 || tourDrafts.length > 0 || tasks.length > 0;

  const [apiCounts, setApiCounts] = useState<ApiBadgeCounts | null>(null);

  useEffect(() => {
    if (!tables.length || storeHasBadgeData) return;

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
  }, [tables.length, storeHasBadgeData, tableKey]);

  if (storeHasBadgeData || !tables.length) {
    return storeCounts;
  }

  return {
    tourDesignAttention: apiCounts?.tourDesignAttention ?? 0,
    activeTasks: apiCounts?.activeTasks ?? 0,
  };
}
