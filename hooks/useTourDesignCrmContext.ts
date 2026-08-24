'use client';

import { useCallback, useEffect } from 'react';
import { useStore } from '@/hooks/useStore';
import { withoutAutoSyncAsync } from '@/lib/db/auto-sync';
import type { TourDesignCrmContext } from '@/lib/tour-design/tour-design-types';

const CRM_CONTEXT_URL = '/api/tour-design/crm-context';

type TourDesignCrmContextApiResponse = {
  ok: true;
  data: TourDesignCrmContext;
};

const crmContextInflight = new Map<
  string,
  Promise<{
    response: Response;
    body: unknown;
  }>
>();

function isTourDesignCrmContextApiResponse(
  value: unknown,
): value is TourDesignCrmContextApiResponse {
  if (!value || typeof value !== 'object') return false;
  const body = value as Record<string, unknown>;
  if (body.ok !== true || !body.data || typeof body.data !== 'object') return false;
  const data = body.data as Record<string, unknown>;
  return Array.isArray(data.customers) && Array.isArray(data.leads);
}

export function fetchTourDesignCrmContextOnce(url = CRM_CONTEXT_URL) {
  const existing = crmContextInflight.get(url);
  if (existing) return existing;

  const request = fetch(url, { credentials: 'same-origin' })
    .then(async (response) => ({
      response,
      body: (await response.json()) as unknown,
    }))
    .finally(() => {
      crmContextInflight.delete(url);
    });

  crmContextInflight.set(url, request);
  return request;
}

/**
 * Fresh customers + leads for Tour Design (dropdown + Sales handoff queue).
 * Refetches on each mount so new pipeline leads appear without stale route cache.
 */
export function useTourDesignCrmContext() {
  const setCustomers = useStore((s) => s.setCustomers);
  const setLeads = useStore((s) => s.setLeads);

  const reload = useCallback(async () => {
    const { response, body } = await fetchTourDesignCrmContextOnce();
    if (!response.ok || !isTourDesignCrmContextApiResponse(body)) {
      return false;
    }

    await withoutAutoSyncAsync(async () => {
      setCustomers(body.data.customers);
      setLeads(body.data.leads);
    });
    return true;
  }, [setCustomers, setLeads]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { reload };
}
