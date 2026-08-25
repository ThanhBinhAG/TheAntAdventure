'use client';

import { useCallback } from 'react';
import { useStore } from '@/hooks/useStore';
import { withoutAutoSyncAsync } from '@/lib/db/auto-sync';
import type {
  CustomerCommCreateBody,
  CustomerInquiryBody,
} from '@/lib/customers/customer-list-input';
import type { Comm, Lead } from '@/lib/types';

export type CustomerInquiryOutcome =
  | { ok: true; lead: Lead }
  | { ok: false; error: 'save_failed'; message: string };

export type CustomerCommOutcome =
  | { ok: true; comm: Comm }
  | { ok: false; error: 'save_failed'; message: string };

type InquiryResponse = {
  ok?: boolean;
  error?: string;
  lead?: Lead;
};

type CommResponse = {
  ok?: boolean;
  error?: string;
  comm?: Comm;
};

async function readInquiryJson(res: Response): Promise<InquiryResponse> {
  try {
    return (await res.json()) as InquiryResponse;
  } catch {
    return { ok: false, error: `Request failed (${res.status})` };
  }
}

async function readCommJson(res: Response): Promise<CommResponse> {
  try {
    return (await res.json()) as CommResponse;
  } catch {
    return { ok: false, error: `Request failed (${res.status})` };
  }
}

/** Profile modal: create Inquiry lead + log comm via CRM BFF. */
export function useCustomerProfileMutations() {
  const addLead = useStore((s) => s.addLead);
  const addComm = useStore((s) => s.addComm);

  const createInquiry = useCallback(
    async (
      customerId: string,
      body: CustomerInquiryBody = { flagTourDesign: true },
    ): Promise<CustomerInquiryOutcome> => {
      const res = await fetch(
        `/api/customers/${encodeURIComponent(customerId)}/inquiry`,
        {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        },
      );
      const payload = await readInquiryJson(res);
      if (!res.ok || !payload.ok || !payload.lead) {
        return {
          ok: false,
          error: 'save_failed',
          message: payload.error || 'Không thể tạo inquiry.',
        };
      }

      await withoutAutoSyncAsync(async () => {
        addLead(payload.lead!);
      });

      return { ok: true, lead: payload.lead };
    },
    [addLead],
  );

  const logComm = useCallback(
    async (
      customerId: string,
      body: CustomerCommCreateBody,
    ): Promise<CustomerCommOutcome> => {
      const res = await fetch(
        `/api/customers/${encodeURIComponent(customerId)}/comms`,
        {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        },
      );
      const payload = await readCommJson(res);
      if (!res.ok || !payload.ok || !payload.comm) {
        return {
          ok: false,
          error: 'save_failed',
          message: payload.error || 'Không thể ghi communication.',
        };
      }

      await withoutAutoSyncAsync(async () => {
        addComm(payload.comm!);
      });

      return { ok: true, comm: payload.comm };
    },
    [addComm],
  );

  return { createInquiry, logComm };
}
