'use client';

import { useCallback } from 'react';
import { useStore } from '@/hooks/useStore';
import { withoutAutoSyncAsync } from '@/lib/db/sync-guard';
import type { Customer } from '@/lib/types';
import {
  buildCustomerPageUrl,
} from '@/hooks/useCustomerPage';

type CustomersCatalogApiResponse = {
  ok: true;
  items: Customer[];
};

/** One catalog GET per session unless `reloadCatalog` forces a refresh. */
let catalogSessionLoaded = false;

const inflight = new Map<
  string,
  Promise<{ response: Response; body: unknown }>
>();

function fetchCustomerJsonOnce(url: string) {
  const existing = inflight.get(url);
  if (existing) return existing;
  const request = fetch(url, { credentials: 'same-origin' })
    .then(async (response) => ({
      response,
      body: (await response.json()) as unknown,
    }))
    .finally(() => {
      inflight.delete(url);
    });
  inflight.set(url, request);
  return request;
}

function isCustomersCatalogApiResponse(
  value: unknown,
): value is CustomersCatalogApiResponse {
  if (!value || typeof value !== 'object') return false;
  const body = value as Record<string, unknown>;
  return body.ok === true && Array.isArray(body.items);
}

/**
 * Customers catalog in Zustand via CRM BFF (no PostgREST).
 * Used by Bookings picker after bookings page boot no longer hydrates customers.
 */
export function useEnsureCustomersCatalogLoaded() {
  const setCustomers = useStore((s) => s.setCustomers);

  const reloadCatalog = useCallback(async () => {
    const { response, body } = await fetchCustomerJsonOnce(
      buildCustomerPageUrl({ page: 1, pageSize: 96 }),
    );
    if (!response.ok || !isCustomersCatalogApiResponse(body)) {
      return;
    }
    await withoutAutoSyncAsync(async () => {
      setCustomers(body.items);
    });
    catalogSessionLoaded = true;
  }, [setCustomers]);

  const ensureCatalog = useCallback(async () => {
    if (catalogSessionLoaded) return;
    await reloadCatalog();
  }, [reloadCatalog]);

  return { ensureCatalog, reloadCatalog };
}
