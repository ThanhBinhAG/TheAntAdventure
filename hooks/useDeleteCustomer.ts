'use client';

import { useCallback } from 'react';
import { useStore } from '@/hooks/useStore';
import {
  applyLocalCustomerDelete,
  captureCustomerDeleteSnapshot,
  customerDeleteBlocked,
  customerDeleteBlockedMessage,
  restoreCustomerDeleteSnapshot,
} from '@/lib/customers/customer-delete';
import { withoutAutoSyncAsync } from '@/lib/db/auto-sync';
import { persistRouteCacheFromStore } from '@/lib/db/hydrate';

export type CustomerDeleteResult =
  | { ok: true }
  | { ok: false; error: 'not_found' | 'blocked' | 'remote_failed'; message: string };

/**
 * BFF-first delete: CRM `/api/customers/:id` is source of truth.
 * List UI may show API rows not yet (or no longer) in Zustand — do not require a store hit.
 */
export function useDeleteCustomer() {
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

      const inStore = slice.customers.some((c) => c.id === id);
      const snapshot = inStore ? captureCustomerDeleteSnapshot(id, slice) : null;

      if (inStore) {
        const blocked = customerDeleteBlocked(id, slice.customers, slice.bookings);
        if (blocked) {
          return {
            ok: false,
            error: 'blocked',
            message: customerDeleteBlockedMessage(blocked),
          };
        }
        // Optimistic local cascade only when we have store rows to roll back.
        // Suppress auto-sync: DELETE BFF already removed remote rows.
        await withoutAutoSyncAsync(async () => {
          useStore.setState((current) =>
            applyLocalCustomerDelete(id, {
              customers: current.customers,
              leads: current.leads,
              comms: current.comms,
              tourDrafts: current.tourDrafts,
              tourOutlineDays: current.tourOutlineDays,
              feedback: current.feedback,
            }),
          );
        });
      }

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
          if (snapshot) {
            await withoutAutoSyncAsync(async () => {
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
            });
          }

          if (res.status === 404) {
            return {
              ok: false,
              error: 'not_found',
              message:
                typeof body.error === 'string'
                  ? body.error
                  : 'Không tìm thấy khách hàng.',
            };
          }
          if (res.status === 409) {
            return {
              ok: false,
              error: 'blocked',
              message:
                typeof body.error === 'string'
                  ? body.error
                  : customerDeleteBlockedMessage('has_bookings'),
            };
          }
          return {
            ok: false,
            error: 'remote_failed',
            message:
              typeof body.error === 'string'
                ? body.error
                : 'Không thể xóa khách hàng trên server.',
          };
        }

        if (!inStore) {
          // Ensure related store slices drop this id if present under other keys.
          await withoutAutoSyncAsync(async () => {
            useStore.setState((current) =>
              applyLocalCustomerDelete(id, {
                customers: current.customers,
                leads: current.leads,
                comms: current.comms,
                tourDrafts: current.tourDrafts,
                tourOutlineDays: current.tourOutlineDays,
                feedback: current.feedback,
              }),
            );
          });
        }

        persistRouteCacheFromStore('customers');
        return { ok: true };
      } catch {
        if (snapshot) {
          await withoutAutoSyncAsync(async () => {
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
          });
        }
        return {
          ok: false,
          error: 'remote_failed',
          message: 'Không thể xóa khách hàng trên server.',
        };
      }
    },
    [],
  );

  return { deleteCustomer };
}
