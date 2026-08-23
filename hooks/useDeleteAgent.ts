'use client';

import { useCallback } from 'react';
import { useStore } from '@/hooks/useStore';
import { PROTECTED_AGENT_ID } from '@/lib/agents/agent-ids';
import { withoutAutoSyncAsync } from '@/lib/db/auto-sync';
import { persistRouteCacheFromStore } from '@/lib/db/hydrate';

export type AgentDeleteResult =
  | { ok: true }
  | { ok: false; error: 'not_found' | 'blocked' | 'remote_failed'; message: string };

/**
 * BFF-first delete: CRM `/api/agents/:id` is source of truth.
 * Soft-blocks AGT-001 locally and on the server (409).
 */
export function useDeleteAgent() {
  const deleteAgent = useCallback(
    async (id: string): Promise<AgentDeleteResult> => {
      if (id === PROTECTED_AGENT_ID) {
        return {
          ok: false,
          error: 'blocked',
          message: 'Không thể xóa đại lý Direct Client (AGT-001).',
        };
      }

      const state = useStore.getState();
      const existing = state.agents.find((a) => a.id === id) ?? null;

      if (existing) {
        await withoutAutoSyncAsync(async () => {
          useStore.getState().deleteAgent(id);
        });
      }

      try {
        const res = await fetch(`/api/agents/${encodeURIComponent(id)}`, {
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
              useStore.getState().addAgent(existing);
            });
          }

          if (res.status === 404) {
            return {
              ok: false,
              error: 'not_found',
              message:
                typeof body.error === 'string'
                  ? body.error
                  : 'Không tìm thấy đại lý.',
            };
          }
          if (res.status === 409) {
            return {
              ok: false,
              error: 'blocked',
              message:
                typeof body.error === 'string'
                  ? body.error
                  : 'Không thể xóa đại lý này.',
            };
          }
          return {
            ok: false,
            error: 'remote_failed',
            message:
              typeof body.error === 'string'
                ? body.error
                : 'Không thể xóa đại lý trên server.',
          };
        }

        if (!existing) {
          await withoutAutoSyncAsync(async () => {
            useStore.getState().deleteAgent(id);
          });
        }

        persistRouteCacheFromStore('agents');
        return { ok: true };
      } catch {
        if (existing) {
          await withoutAutoSyncAsync(async () => {
            useStore.getState().addAgent(existing);
          });
        }
        return {
          ok: false,
          error: 'remote_failed',
          message: 'Không thể xóa đại lý trên server.',
        };
      }
    },
    [],
  );

  return { deleteAgent };
}
