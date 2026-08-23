'use client';

import { useCallback } from 'react';
import { useStore } from '@/hooks/useStore';
import {
  captureCustomerDeleteSnapshot,
  customerDeleteBlocked,
  customerDeleteBlockedMessage,
  restoreCustomerDeleteSnapshot,
} from '@/lib/customers/customer-delete';
import { persistRouteCacheFromStore } from '@/lib/db/hydrate';

export type CustomerDeleteResult =
  | { ok: true }
  | { ok: false; error: 'not_found' | 'blocked' | 'remote_failed'; message: string };

export function useDeleteCustomer() {
  const deleteCustomerLocal = useStore((s) => s.deleteCustomer);

  const deleteCustomer = useCallback(
    async (id: string): Promise<CustomerDeleteResult> => {
      const state = useStore.getState();
      const slice = {
        customers: state.customers,
        leads: state.leads,
        comms: state.comms,
        tourDrafts: state.tourDrafts,
        tourOutlineDays: state.tourOutlineDays,
        feedback: state.feedback,
        bookings: state.bookings,
      };

      const snapshot = captureCustomerDeleteSnapshot(id, slice);
      if (!snapshot) {
        return { ok: false, error: 'not_found', message: 'Không tìm thấy khách hàng.' };
      }

      const blocked = customerDeleteBlocked(id, slice.customers, slice.bookings);
      if (blocked) {
        return {
          ok: false,
          error: 'blocked',
          message: customerDeleteBlockedMessage(blocked),
        };
      }

      deleteCustomerLocal(id);

      try {
        const res = await fetch(`/api/customers/${encodeURIComponent(id)}`, {
          method: 'DELETE',
          credentials: 'same-origin',
        });
        const body = (await res.json().catch(() => ({}))) as {
          ok?: boolean;
          error?: string;
        };

        if (!res.ok || body.ok === false) {
          useStore.setState((current) =>
            restoreCustomerDeleteSnapshot(snapshot, {
              customers: current.customers,
              leads: current.leads,
              comms: current.comms,
              tourDrafts: current.tourDrafts,
              tourOutlineDays: current.tourOutlineDays,
              feedback: current.feedback,
            }),
          );
          return {
            ok: false,
            error: res.status === 409 ? 'blocked' : 'remote_failed',
            message:
              typeof body.error === 'string'
                ? body.error
                : 'Không thể xóa khách hàng trên server.',
          };
        }

        persistRouteCacheFromStore('customers');
        return { ok: true };
      } catch {
        useStore.setState((current) =>
          restoreCustomerDeleteSnapshot(snapshot, {
            customers: current.customers,
            leads: current.leads,
            comms: current.comms,
            tourDrafts: current.tourDrafts,
            tourOutlineDays: current.tourOutlineDays,
            feedback: current.feedback,
          }),
        );
        return {
          ok: false,
          error: 'remote_failed',
          message: 'Không thể xóa khách hàng trên server.',
        };
      }
    },
    [deleteCustomerLocal],
  );

  return { deleteCustomer };
}
