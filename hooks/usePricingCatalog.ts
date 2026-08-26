'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  loadAccommodationCatalog,
  loadEssentialsCatalog,
} from '@/lib/pricing/catalog-api';
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

type CatalogLoadResult<T> = { loaded: T; imported: CatalogImportRecord | null };

/** Share in-flight catalog GETs across Strict Mode remounts. */
const catalogLoadInflight = new Map<CatalogWorkbook, Promise<CatalogLoadResult<unknown>>>();

function loadCatalogOnce<T>(
  workbook: CatalogWorkbook,
  loader: () => Promise<{ catalog: T; lastImport: CatalogImportRecord | null }>,
): Promise<CatalogLoadResult<T>> {
  const existing = catalogLoadInflight.get(workbook);
  if (existing) return existing as Promise<CatalogLoadResult<T>>;
  const work = loader()
    .then(({ catalog: loaded, lastImport: imported }) => ({ loaded, imported }))
    .finally(() => {
      catalogLoadInflight.delete(workbook);
    });
  catalogLoadInflight.set(workbook, work as Promise<CatalogLoadResult<unknown>>);
  return work;
}

function useCatalog<T>(
  workbook: CatalogWorkbook,
  loader: () => Promise<{ catalog: T; lastImport: CatalogImportRecord | null }>,
  fallback: () => T
): CatalogState<T> {
  // The browser no longer knows Supabase configuration; the CRM BFF owns it.
  const configured = true;
  const [data, setDataState] = useState<T>(fallback);
  const [lastImport, setLastImport] = useState<CatalogImportRecord | null>(null);
  const [loading, setLoading] = useState(configured);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    await Promise.resolve();
    setLoading(true);
    setError(null);
    try {
      const { loaded, imported } = await loadCatalogOnce(workbook, loader);
      setDataState(loaded);
      setLastImport(imported);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load the pricing catalog.');
    } finally {
      setLoading(false);
    }
    // loader/fallback are module-level functions and stable per hook instance.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configured, workbook]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void reload();
    }, 0);
    return () => window.clearTimeout(timer);
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
