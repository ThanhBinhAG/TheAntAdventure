'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  isCatalogConfigured,
  loadAccommodationCatalog,
  loadEssentialsCatalog,
  loadLatestImport,
} from '@/lib/pricing/catalog-db';
import {
  emptyAccommodationCatalog,
  emptyEssentialsCatalog,
  type AccommodationCatalog,
  type CatalogImportRecord,
  type CatalogWorkbook,
  type EssentialsCatalog,
} from '@/lib/pricing/catalog-types';

interface CatalogState<T> {
  data: T;
  lastImport: CatalogImportRecord | null;
  loading: boolean;
  error: string | null;
  configured: boolean;
  reload: () => Promise<void>;
  setData: (updater: (previous: T) => T) => void;
}

function useCatalog<T>(
  workbook: CatalogWorkbook,
  loader: () => Promise<T>,
  fallback: () => T
): CatalogState<T> {
  const [data, setDataState] = useState<T>(fallback);
  const [lastImport, setLastImport] = useState<CatalogImportRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const configured = isCatalogConfigured();

  const reload = useCallback(async () => {
    if (!configured) {
      setLoading(false);
      setError('Supabase is not configured — imported pricing cannot be loaded.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [loaded, imported] = await Promise.all([loader(), loadLatestImport(workbook)]);
      setDataState(loaded);
      setLastImport(imported);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load the pricing catalog.');
    } finally {
      setLoading(false);
    }
    // loader/fallback are module-level functions and stable per hook instance
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configured, workbook]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const setData = useCallback((updater: (previous: T) => T) => {
    setDataState((previous) => updater(previous));
  }, []);

  return { data, lastImport, loading, error, configured, reload, setData };
}

export function useEssentialsCatalog(): CatalogState<EssentialsCatalog> {
  return useCatalog('essentials', loadEssentialsCatalog, emptyEssentialsCatalog);
}

export function useAccommodationCatalog(): CatalogState<AccommodationCatalog> {
  return useCatalog('accommodation', loadAccommodationCatalog, emptyAccommodationCatalog);
}
