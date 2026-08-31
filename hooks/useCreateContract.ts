'use client';

import { useCallback } from 'react';
import { withoutAutoSyncAsync } from '@/lib/db/sync-guard';
import type { ContractInput, ContractListItem } from '@/lib/contracts/contract-input';
import { useStore } from '@/hooks/useStore';

export type CreateContractOutcome =
  | { ok: true; contract: ContractListItem }
  | { ok: false; error: 'save_failed'; message: string };

type CreateContractResponse = {
  ok?: boolean;
  error?: string;
  data?: ContractListItem;
};

async function readJson(res: Response): Promise<CreateContractResponse> {
  try {
    return (await res.json()) as CreateContractResponse;
  } catch {
    return { ok: false, error: `Request failed (${res.status})` };
  }
}

export function useCreateContract() {
  const addContract = useStore((s) => s.addContract);

  const createContract = useCallback(
    async (contract: ContractInput): Promise<CreateContractOutcome> => {
      const res = await fetch('/api/contracts', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contract }),
      });
      const body = await readJson(res);

      if (!res.ok || !body.ok || !body.data) {
        return {
          ok: false,
          error: 'save_failed',
          message: body.error || 'Không thể tạo hợp đồng.',
        };
      }

      await withoutAutoSyncAsync(async () => {
        addContract(body.data as Record<string, unknown>);
      });

      return { ok: true, contract: body.data };
    },
    [addContract],
  );

  return { createContract };
}
