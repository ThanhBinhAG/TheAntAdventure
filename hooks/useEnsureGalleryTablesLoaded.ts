'use client';

import { useEffect, useSyncExternalStore } from 'react';
import { ensureTablesLoaded, getHydrationState, subscribeHydration } from '@/lib/db/hydrate';
import type { SyncArrayTable } from '@/lib/db/sync-config';
import type { HydrationState } from '@/lib/db/sync-lifecycle';

const GALLERY_TABLES: readonly SyncArrayTable[] = ['photos', 'photo_folders'];

function galleryTablesHydrated(state: HydrationState): boolean {
  return GALLERY_TABLES.every((t) => state.hydratedTables.includes(t));
}

/** Lazy-load gallery tables when a picker opens (safe to call repeatedly). */
export function useEnsureGalleryTablesLoaded(enabled: boolean): { loading: boolean } {
  const hydration = useSyncExternalStore(subscribeHydration, getHydrationState, getHydrationState);
  const hydrated = galleryTablesHydrated(hydration);

  useEffect(() => {
    if (!enabled || hydrated) return;
    void ensureTablesLoaded(GALLERY_TABLES);
  }, [enabled, hydrated]);

  return { loading: enabled && !hydrated };
}
