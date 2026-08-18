'use client';

import { useCallback } from 'react';
import { useStore } from '@/hooks/useStore';
import {
  captureCustomerDeleteSnapshot,
  customerDeleteBlocked,
  customerDeleteBlockedMessage,
  restoreCustomerDeleteSnapshot,
} from '@/lib/customers/customer-delete';
import { deleteCustomerFromRemote } from '@/lib/db/remote-delete';
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
        await deleteCustomerFromRemote(id);
        persistRouteCacheFromStore('customers');
        return { ok: true };
      } catch (e) {
        useStore.setState((s) =>
          restoreCustomerDeleteSnapshot(snapshot, {
            customers: s.customers,
            leads: s.leads,
            comms: s.comms,
            tourDrafts: s.tourDrafts,
            tourOutlineDays: s.tourOutlineDays,
            feedback: s.feedback,
          })
        );
        const message = e instanceof Error ? e.message : 'Không thể xóa trên Supabase.';
        return { ok: false, error: 'remote_failed', message };
      }
    },
    [deleteCustomerLocal]
  );

  return { deleteCustomer };
}
