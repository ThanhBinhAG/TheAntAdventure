'use client';

import { useCallback } from 'react';
import { useStore } from '@/hooks/useStore';
import { withoutAutoSyncAsync } from '@/lib/db/sync-guard';

export type DeleteContractOutcome =
  | { ok: true }
  | { ok: false; error: 'not_found' | 'remote_failed'; message: string };

/**
 * BFF-first delete: CRM `DELETE /api/contracts/:id` is source of truth.
 */
export function useDeleteContract() {
  const deleteContract = useCallback(async (id: string): Promise<DeleteContractOutcome> => {
    const state = useStore.getState();
    const existing =
      (state.contracts as { id?: string }[]).find((c) => c.id === id) ?? null;

    if (existing) {
      await withoutAutoSyncAsync(async () => {
        useStore.getState().deleteContract(id);
      });
    }

    try {
      const res = await fetch(`/api/contracts/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        credentials: 'same-origin',
      });
      const body = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
      };

      if (!res.ok || body.ok === false) {
        if (existing) {
          await withoutAutoSyncAsync(async () => {
            useStore.getState().addContract(existing as Record<string, unknown>);
          });
        }

        if (res.status === 404) {
          return {
            ok: false,
            error: 'not_found',
            message:
              typeof body.error === 'string'
                ? body.error
                : 'Contract not found.',
          };
        }

        return {
          ok: false,
          error: 'remote_failed',
          message:
            typeof body.error === 'string'
              ? body.error
              : 'Could not delete contract on the server.',
        };
      }

      if (!existing) {
        await withoutAutoSyncAsync(async () => {
          useStore.getState().deleteContract(id);
        });
      }

      return { ok: true };
    } catch {
      if (existing) {
        await withoutAutoSyncAsync(async () => {
          useStore.getState().addContract(existing as Record<string, unknown>);
        });
      }
      return {
        ok: false,
        error: 'remote_failed',
        message: 'Could not delete contract on the server.',
      };
    }
  }, []);

  return { deleteContract };
}
