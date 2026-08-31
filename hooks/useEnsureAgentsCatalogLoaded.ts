'use client';

import { useCallback } from 'react';
import { useStore } from '@/hooks/useStore';
import { withoutAutoSyncAsync } from '@/lib/db/sync-guard';
import type { Agent } from '@/lib/types';
import { buildAgentPageUrl, fetchAgentJsonOnce } from '@/hooks/useAgentPage';

type AgentsCatalogApiResponse = {
  ok: true;
  items: Agent[];
};

/** One catalog GET per session unless `reloadCatalog` forces a refresh. */
let catalogSessionLoaded = false;

function isAgentsCatalogApiResponse(
  value: unknown,
): value is AgentsCatalogApiResponse {
  if (!value || typeof value !== 'object') return false;
  const body = value as Record<string, unknown>;
  return body.ok === true && Array.isArray(body.items);
}

/**
 * Agents catalog in Zustand via CRM BFF (no PostgREST).
 * Prefer seeding from the list page when it already returns the full set;
 * otherwise `ensureCatalog` loads `pageSize=96` once (Strict Mode–deduped).
 */
export function useEnsureAgentsCatalogLoaded() {
  const setAgents = useStore((s) => s.setAgents);

  const applyCatalogItems = useCallback(
    async (items: Agent[]) => {
      await withoutAutoSyncAsync(async () => {
        setAgents(items);
      });
      catalogSessionLoaded = true;
    },
    [setAgents],
  );

  const reloadCatalog = useCallback(async () => {
    const { response, body } = await fetchAgentJsonOnce(
      buildAgentPageUrl({ page: 1, pageSize: 96 }),
    );
    if (!response.ok || !isAgentsCatalogApiResponse(body)) {
      return;
    }
    await withoutAutoSyncAsync(async () => {
      setAgents(body.items);
    });
    catalogSessionLoaded = true;
  }, [setAgents]);

  const ensureCatalog = useCallback(async () => {
    if (catalogSessionLoaded) return;
    await reloadCatalog();
  }, [reloadCatalog]);

  return { applyCatalogItems, ensureCatalog, reloadCatalog };
}
