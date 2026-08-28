'use client';

import { useCallback } from 'react';
import { withoutAutoSyncAsync } from '@/lib/db/auto-sync';
import type {
  ExtendedSupplierInput,
  ExtendedSupplierListItem,
} from '@/lib/suppliers/extended-supplier-input';
import type { ExtendedSupplier } from '@/lib/types';
import { useStore } from '@/hooks/useStore';

export type ExtendedSupplierMutationOutcome =
  | { ok: true; supplier: ExtendedSupplierListItem }
  | { ok: false; error: 'save_failed'; message: string };

export type ExtendedSupplierDeleteOutcome =
  | { ok: true }
  | { ok: false; error: 'save_failed'; message: string };

type ApiResponse = {
  ok?: boolean;
  error?: string;
  data?: ExtendedSupplierListItem;
};

async function readJson(res: Response): Promise<ApiResponse> {
  try {
    return (await res.json()) as ApiResponse;
  } catch {
    return { ok: false, error: `Request failed (${res.status})` };
  }
}

export function useExtendedSupplierMutations() {
  const specialSuppliers = useStore((s) => s.specialSuppliers);
  const addSpecialSupplier = useStore((s) => s.addSpecialSupplier);
  const updateSpecialSupplier = useStore((s) => s.updateSpecialSupplier);
  const removeSpecialSupplier = useStore((s) => s.removeSpecialSupplier);

  const createSupplier = useCallback(
    async (
      supplier: ExtendedSupplierInput | ExtendedSupplier,
    ): Promise<ExtendedSupplierMutationOutcome> => {
      const payload: ExtendedSupplierInput = {
        id: supplier.id || undefined,
        cat: supplier.cat,
        subcat: supplier.subcat,
        name: supplier.name,
        ename: supplier.ename,
        contact: supplier.contact,
        phone: supplier.phone,
        email: supplier.email,
        location: supplier.location,
        region: supplier.region,
        rate: supplier.rate,
        currency: supplier.currency ?? 'USD',
        payment: supplier.payment,
        contract: supplier.contract,
        cancel: supplier.cancel,
        insurance: supplier.insurance,
        avail: supplier.avail,
        desc: supplier.desc,
        notes: supplier.notes,
        tags: supplier.tags ?? [],
        rating: supplier.rating,
        status: supplier.status ?? 'Active',
      };
      const res = await fetch('/api/suppliers', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ supplier: payload }),
      });
      const body = await readJson(res);
      if (!res.ok || !body.ok || !body.data) {
        return {
          ok: false,
          error: 'save_failed',
          message: body.error || 'Không thể tạo supplier.',
        };
      }
      await withoutAutoSyncAsync(async () => {
        addSpecialSupplier(body.data as ExtendedSupplier);
      });
      return { ok: true, supplier: body.data };
    },
    [addSpecialSupplier],
  );

  const patchSupplier = useCallback(
    async (
      supplierId: string,
      supplier: ExtendedSupplier,
    ): Promise<ExtendedSupplierMutationOutcome> => {
      const current = specialSuppliers.find((s) => s.id === supplierId);
      if (!current) {
        return {
          ok: false,
          error: 'save_failed',
          message: 'Không tìm thấy supplier trên client.',
        };
      }

      const previous = { ...current, tags: [...(current.tags ?? [])] };
      await withoutAutoSyncAsync(async () => {
        updateSpecialSupplier(supplierId, supplier);
      });

      const res = await fetch(
        `/api/suppliers/${encodeURIComponent(supplierId)}`,
        {
          method: 'PATCH',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ supplier: { ...supplier, id: supplierId } }),
        },
      );
      const body = await readJson(res);

      if (!res.ok || !body.ok || !body.data) {
        await withoutAutoSyncAsync(async () => {
          updateSpecialSupplier(supplierId, previous);
        });
        return {
          ok: false,
          error: 'save_failed',
          message: body.error || 'Không thể cập nhật supplier.',
        };
      }

      await withoutAutoSyncAsync(async () => {
        updateSpecialSupplier(supplierId, body.data as ExtendedSupplier);
      });
      return { ok: true, supplier: body.data };
    },
    [specialSuppliers, updateSpecialSupplier],
  );

  const deleteSupplier = useCallback(
    async (supplierId: string): Promise<ExtendedSupplierDeleteOutcome> => {
      const current =
        specialSuppliers.find((s) => s.id === supplierId) ?? null;
      if (current) {
        await withoutAutoSyncAsync(async () => {
          removeSpecialSupplier(supplierId);
        });
      }

      const res = await fetch(
        `/api/suppliers/${encodeURIComponent(supplierId)}`,
        {
          method: 'DELETE',
          credentials: 'same-origin',
        },
      );
      const body = await readJson(res);

      if (!res.ok || body.ok === false) {
        if (current) {
          await withoutAutoSyncAsync(async () => {
            addSpecialSupplier(current);
          });
        }
        return {
          ok: false,
          error: 'save_failed',
          message: body.error || 'Không thể xóa supplier.',
        };
      }

      return { ok: true };
    },
    [addSpecialSupplier, removeSpecialSupplier, specialSuppliers],
  );

  return { createSupplier, patchSupplier, deleteSupplier };
}
