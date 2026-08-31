'use client';

import { useCallback } from 'react';
import { useStore } from '@/hooks/useStore';
import { withoutAutoSyncAsync } from '@/lib/db/sync-guard';
import type { LeadPatchBody, LeadListItem } from '@/lib/sales/lead-list-input';
import type { Lead } from '@/lib/types';

export type LeadUpdateOutcome =
  | { ok: true; lead: LeadListItem }
  | { ok: false; error: 'save_failed'; message: string };

type LeadMutationResponse = {
  ok?: boolean;
  error?: string;
  lead?: LeadListItem;
};

async function readJson(res: Response): Promise<LeadMutationResponse> {
  try {
    return (await res.json()) as LeadMutationResponse;
  } catch {
    return { ok: false, error: `Request failed (${res.status})` };
  }
}

export function useUpdateLead() {
  const updateLead = useStore((s) => s.updateLead);

  const patchLead = useCallback(
    async (leadId: string, patch: LeadPatchBody): Promise<LeadUpdateOutcome> => {
      const res = await fetch(`/api/leads/${encodeURIComponent(leadId)}`, {
        method: 'PATCH',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      const body = await readJson(res);

      if (!res.ok || !body.ok || !body.lead) {
        return {
          ok: false,
          error: 'save_failed',
          message: body.error || 'Không thể cập nhật lead.',
        };
      }

      await withoutAutoSyncAsync(async () => {
        updateLead(body.lead!.id, body.lead as Partial<Lead>);
      });

      return { ok: true, lead: body.lead };
    },
    [updateLead],
  );

  return { patchLead };
}
