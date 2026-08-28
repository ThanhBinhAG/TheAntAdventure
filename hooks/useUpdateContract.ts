'use client';

import { useCallback } from 'react';
import { withoutAutoSyncAsync } from '@/lib/db/auto-sync';
import type { ContractInput, ContractListItem } from '@/lib/contracts/contract-input';
import { useStore } from '@/hooks/useStore';

export type UpdateContractOutcome =
  | { ok: true; contract: ContractListItem }
  | { ok: false; error: 'save_failed'; message: string };

type UpdateContractResponse = {
  ok?: boolean;
  error?: string;
  data?: ContractListItem;
};

async function readJson(res: Response): Promise<UpdateContractResponse> {
  try {
    return (await res.json()) as UpdateContractResponse;
  } catch {
    return { ok: false, error: `Request failed (${res.status})` };
  }
}

function toInput(item: ContractListItem, patch: Partial<ContractListItem>): ContractInput & { id: string } {
  const merged: ContractListItem = {
    ...item,
    ...patch,
    id: item.id,
  };
  return {
    id: merged.id,
    bookingId: merged.bookingId ?? '',
    clientName: merged.clientName,
    nationality: merged.nationality ?? '',
    pax: merged.pax,
    rooms: merged.rooms ?? '',
    tourName: merged.tourName,
    duration: merged.duration ?? '',
    departureDate: merged.departureDate,
    returnDate: merged.returnDate,
    route: merged.route ?? '',
    inclusions: merged.inclusions ?? '',
    exclusions: merged.exclusions ?? '',
    flights: merged.flights ?? '',
    currency: merged.currency,
    total: merged.total,
    depositPct: merged.depositPct,
    depositAmt: merged.depositAmt,
    balanceDueDate: merged.balanceDueDate,
    status: (merged.status as ContractInput['status']) || 'Draft',
    createdAt: merged.createdAt,
    signedAt: merged.signedAt ?? null,
    notes: merged.notes ?? '',
  };
}

export function useUpdateContract() {
  const updateContract = useStore((s) => s.updateContract);
  const contracts = useStore((s) => s.contracts);

  const patchContract = useCallback(
    async (
      contractId: string,
      patch: Partial<ContractListItem>,
    ): Promise<UpdateContractOutcome> => {
      const current = (contracts as ContractListItem[]).find((c) => c.id === contractId);
      if (!current) {
        return {
          ok: false,
          error: 'save_failed',
          message: 'Không tìm thấy hợp đồng trên client.',
        };
      }

      const previous = { ...current };

      await withoutAutoSyncAsync(async () => {
        updateContract(contractId, patch as Record<string, unknown>);
      });

      const payload = toInput(current, patch);

      const res = await fetch(`/api/contracts/${encodeURIComponent(contractId)}`, {
        method: 'PATCH',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contract: payload }),
      });
      const body = await readJson(res);

      if (!res.ok || !body.ok || !body.data) {
        await withoutAutoSyncAsync(async () => {
          updateContract(contractId, previous as Record<string, unknown>);
        });
        return {
          ok: false,
          error: 'save_failed',
          message: body.error || 'Không thể cập nhật hợp đồng.',
        };
      }

      await withoutAutoSyncAsync(async () => {
        updateContract(contractId, body.data as Record<string, unknown>);
      });

      return { ok: true, contract: body.data };
    },
    [contracts, updateContract],
  );

  return { patchContract };
}
