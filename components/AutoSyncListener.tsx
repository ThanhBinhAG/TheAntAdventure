'use client';

import { useEffect } from 'react';
import { isAutoSyncEnabled, isRemoteDataEnabled } from '@/lib/env';
import { detectChangedTables, scheduleAutoSync } from '@/lib/db/auto-sync';
import { useStore } from '@/lib/store';

/** Watches Zustand store and debounces push app → Supabase */
export function AutoSyncListener() {
  useEffect(() => {
    if (!isRemoteDataEnabled() || !isAutoSyncEnabled()) return;

    const unsub = useStore.subscribe((state, prev) => {
      const changed = detectChangedTables(
        state as unknown as Record<string, unknown>,
        prev as unknown as Record<string, unknown>
      );
      if (changed.tables.length || changed.messages) {
        scheduleAutoSync(changed);
      }
    });

    return unsub;
  }, []);

  return null;
}
