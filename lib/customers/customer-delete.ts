import type {
  Booking,
  Comm,
  Customer,
  Lead,
  TourDraft,
  TourOutlineDay,
} from '@/lib/types';

export type CustomerDeleteBlockReason = 'has_bookings';

export type CustomerDeleteSnapshot = {
  customer: Customer;
  leads: Lead[];
  comms: Comm[];
  tourDrafts: TourDraft[];
  tourOutlineDays: TourOutlineDay[];
  feedback: unknown[];
};

type CustomerDeleteState = {
  customers: Customer[];
  leads: Lead[];
  comms: Comm[];
  tourDrafts: TourDraft[];
  tourOutlineDays: TourOutlineDay[];
  feedback: unknown[];
};

function feedbackCustId(row: unknown): string | undefined {
  if (!row || typeof row !== 'object') return undefined;
  const cid = (row as { custId?: string; cust_id?: string }).custId
    ?? (row as { cust_id?: string }).cust_id;
  return cid ? String(cid) : undefined;
}

/** Block delete when the customer still has linked bookings (matches DB ON DELETE RESTRICT). */
export function customerDeleteBlocked(
  id: string,
  customers: Customer[],
  bookings: Booking[]
): CustomerDeleteBlockReason | null {
  const customer = customers.find((c) => c.id === id);
  if (!customer) return null;

  const bookingIds = new Set(customer.bookings ?? []);
  const hasLinkedBooking =
    bookings.some((b) => b.custId === id) ||
    bookings.some((b) => bookingIds.has(b.id));

  return hasLinkedBooking ? 'has_bookings' : null;
}

export function captureCustomerDeleteSnapshot(
  id: string,
  state: CustomerDeleteState
): CustomerDeleteSnapshot | null {
  const customer = state.customers.find((c) => c.id === id);
  if (!customer) return null;

  const leads = state.leads.filter((l) => l.custId === id);
  const comms = state.comms.filter((c) => c.cid === id);
  const tourDrafts = state.tourDrafts.filter((d) => d.custId === id);
  const draftIds = new Set(tourDrafts.map((d) => d.id));
  const tourOutlineDays = state.tourOutlineDays.filter((d) => draftIds.has(d.draftId));
  const feedback = state.feedback.filter((f) => feedbackCustId(f) === id);

  return { customer, leads, comms, tourDrafts, tourOutlineDays, feedback };
}

/** Local store patch after customer delete (mirrors DB CASCADE children). */
export function applyLocalCustomerDelete(
  id: string,
  state: CustomerDeleteState
): Partial<CustomerDeleteState> {
  const tourDrafts = state.tourDrafts.filter((d) => d.custId !== id);
  const removedDraftIds = new Set(
    state.tourDrafts.filter((d) => d.custId === id).map((d) => d.id)
  );

  return {
    customers: state.customers.filter((c) => c.id !== id),
    leads: state.leads.filter((l) => l.custId !== id),
    comms: state.comms.filter((c) => c.cid !== id),
    tourDrafts,
    tourOutlineDays: state.tourOutlineDays.filter((d) => !removedDraftIds.has(d.draftId)),
    feedback: state.feedback.filter((f) => feedbackCustId(f) !== id),
  };
}

export function restoreCustomerDeleteSnapshot(
  snapshot: CustomerDeleteSnapshot,
  state: CustomerDeleteState
): Partial<CustomerDeleteState> {
  const mergeById = <T extends { id: string }>(current: T[], rows: T[]): T[] => {
    const ids = new Set(current.map((r) => r.id));
    return [...current, ...rows.filter((r) => !ids.has(r.id))];
  };

  const mergeOutlineDays = (current: TourOutlineDay[], rows: TourOutlineDay[]): TourOutlineDay[] => {
    const keys = new Set(current.map((d) => d.id));
    return [...current, ...rows.filter((d) => !keys.has(d.id))];
  };

  const mergeFeedback = (current: unknown[], rows: unknown[]): unknown[] => {
    const ids = new Set(
      current
        .map((f) => (f && typeof f === 'object' && 'id' in f ? String((f as { id: unknown }).id) : ''))
        .filter(Boolean)
    );
    return [
      ...current,
      ...rows.filter((f) => {
        if (!f || typeof f !== 'object' || !('id' in f)) return true;
        const fid = String((f as { id: unknown }).id);
        return !ids.has(fid);
      }),
    ];
  };

  return {
    customers: state.customers.some((c) => c.id === snapshot.customer.id)
      ? state.customers
      : [...state.customers, snapshot.customer],
    leads: mergeById(state.leads, snapshot.leads),
    comms: mergeById(state.comms, snapshot.comms),
    tourDrafts: mergeById(state.tourDrafts, snapshot.tourDrafts),
    tourOutlineDays: mergeOutlineDays(state.tourOutlineDays, snapshot.tourOutlineDays),
    feedback: mergeFeedback(state.feedback, snapshot.feedback),
  };
}

export function customerDeleteBlockedMessage(reason: CustomerDeleteBlockReason): string {
  if (reason === 'has_bookings') {
    return 'Không thể xóa — khách này còn booking. Hủy hoặc chuyển booking trước.';
  }
  return 'Không thể xóa khách hàng.';
}
