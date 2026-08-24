'use client';

import { useCallback } from 'react';
import { useStore } from '@/hooks/useStore';
import { withoutAutoSyncAsync } from '@/lib/db/auto-sync';
import type { LeadListItem } from '@/lib/sales/lead-list-input';
import type { Booking, Lead } from '@/lib/types';

export type ConfirmLeadOutcome =
  | { ok: true; lead: LeadListItem; booking: Booking | null }
  | { ok: false; error: 'save_failed'; message: string };

type ConfirmLeadResponse = {
  ok?: boolean;
  error?: string;
  lead?: LeadListItem;
  booking?: Booking | null;
};

async function readJson(res: Response): Promise<ConfirmLeadResponse> {
  try {
    return (await res.json()) as ConfirmLeadResponse;
  } catch {
    return { ok: false, error: `Request failed (${res.status})` };
  }
}

export function useConfirmLead() {
  const updateLead = useStore((s) => s.updateLead);
  const addBooking = useStore((s) => s.addBooking);

  const confirmLead = useCallback(
    async (leadId: string): Promise<ConfirmLeadOutcome> => {
      const res = await fetch(
        `/api/leads/${encodeURIComponent(leadId)}/confirm`,
        {
          method: 'POST',
          credentials: 'same-origin',
        },
      );
      const body = await readJson(res);

      if (!res.ok || !body.ok || !body.lead) {
        return {
          ok: false,
          error: 'save_failed',
          message: body.error || 'Không thể xác nhận lead.',
        };
      }

      await withoutAutoSyncAsync(async () => {
        updateLead(body.lead!.id, body.lead as Partial<Lead>);
        if (body.booking) addBooking(body.booking);
      });

      return {
        ok: true,
        lead: body.lead,
        booking: body.booking ?? null,
      };
    },
    [addBooking, updateLead],
  );

  return { confirmLead };
}
