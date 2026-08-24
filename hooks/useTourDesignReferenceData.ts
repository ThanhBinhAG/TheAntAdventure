'use client';

import { useCallback, useEffect, useState } from 'react';
import { useStore } from '@/hooks/useStore';
import { getBffData } from '@/lib/bff/client';
import { withoutAutoSyncAsync } from '@/lib/db/auto-sync';
import type { TourDesignReferenceData } from '@/lib/tour-design/tour-design-types';

const REFERENCE_DATA_URL = '/api/tour-design/reference-data';

let referenceDataRequest: Promise<TourDesignReferenceData> | null = null;

function fetchTourDesignReferenceDataOnce() {
  if (!referenceDataRequest) {
    referenceDataRequest = getBffData<TourDesignReferenceData>(
      REFERENCE_DATA_URL,
      'Không thể tải dữ liệu tham chiếu Tour Design.',
    ).finally(() => {
      referenceDataRequest = null;
    });
  }
  return referenceDataRequest;
}

/** Loads Tour Design hotel reference data through BFF, never browser PostgREST. */
export function useTourDesignReferenceData() {
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      const data = await fetchTourDesignReferenceDataOnce();
      await withoutAutoSyncAsync(async () => {
        useStore.setState({ hotels: data.hotels });
      });
      setError(null);
      return true;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không thể tải dữ liệu tham chiếu Tour Design.');
      return false;
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void reload();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [reload]);

  return { error, reload };
}
