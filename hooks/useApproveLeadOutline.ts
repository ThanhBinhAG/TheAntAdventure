'use client';

import { useCallback } from 'react';
import { useStore } from '@/hooks/useStore';
import { withoutAutoSyncAsync } from '@/lib/db/auto-sync';
import type { LeadListItem } from '@/lib/sales/lead-list-input';
import type { Comm, Lead, TourDraft } from '@/lib/types';

export type ApproveOutlineOutcome =
  | { ok: true; lead: LeadListItem; draft: TourDraft; comm: Comm }
  | { ok: false; error: 'save_failed'; message: string };

type ApproveOutlineResponse = {
  ok?: boolean;
  error?: string;
  lead?: LeadListItem;
  draft?: TourDraft;
  comm?: Comm;
};

async function readJson(res: Response): Promise<ApproveOutlineResponse> {
  try {
    return (await res.json()) as ApproveOutlineResponse;
  } catch {
    return { ok: false, error: `Request failed (${res.status})` };
  }
}

export function useApproveLeadOutline() {
  const updateLead = useStore((s) => s.updateLead);
  const upsertTourDraft = useStore((s) => s.upsertTourDraft);
  const addComm = useStore((s) => s.addComm);

  const approveOutline = useCallback(
    async (leadId: string): Promise<ApproveOutlineOutcome> => {
      const res = await fetch(
        `/api/leads/${encodeURIComponent(leadId)}/approve-outline`,
        {
          method: 'POST',
          credentials: 'same-origin',
        },
      );
      const body = await readJson(res);

      if (!res.ok || !body.ok || !body.lead || !body.draft || !body.comm) {
        return {
          ok: false,
          error: 'save_failed',
          message: body.error || 'Không thể duyệt outline.',
        };
      }

      await withoutAutoSyncAsync(async () => {
        upsertTourDraft(body.draft!);
        updateLead(body.lead!.id, body.lead as Partial<Lead>);
        addComm(body.comm!);
      });

      return {
        ok: true,
        lead: body.lead,
        draft: body.draft,
        comm: body.comm,
      };
    },
    [addComm, updateLead, upsertTourDraft],
  );

  return { approveOutline };
}
