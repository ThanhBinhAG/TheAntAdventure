import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';
import { assembleBookings, bookingToRow } from '@/lib/db/mappers';
import type { Row } from '@/lib/db/mappers/shared';
import { normalizeBookingDateInput } from '@/lib/bookings/booking-dates';
import { invalidateDashboardCache } from '@/lib/dashboard/dashboard-repository';
import type { Booking } from '@/lib/types';
import { nextBookingId } from './booking-ids';
import type {
  BookingChangeInput,
  BookingInput,
  BookingListItem,
} from './booking-input';

export type { BookingListItem } from './booking-input';

export class BookingRepositoryError extends Error {
  readonly code: 'not_found' | 'validation' | 'conflict';

  constructor(message: string, code: 'not_found' | 'validation' | 'conflict' = 'validation') {
    super(message);
    this.name = 'BookingRepositoryError';
    this.code = code;
  }
}

type ChangePayload = {
  clientId: string;
  description: string;
  detail?: string;
  costImpact?: number;
  cancelFee?: number;
  refund?: number;
  time?: string;
  date: string;
};

function parseChangePayload(raw: unknown): Partial<ChangePayload> {
  if (typeof raw !== 'string' || !raw.trim()) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') return {};
    return parsed as Partial<ChangePayload>;
  } catch {
    return {};
  }
}

function rowToBookingChange(r: Row): BookingChangeInput {
  const payload = parseChangePayload(r.new_value);
  return {
    id: payload.clientId || String(r.id),
    type: String(r.field_name ?? ''),
    date: payload.date || (r.changed_at ? String(r.changed_at).slice(0, 10) : ''),
    time: payload.time,
    by: r.changed_by ? String(r.changed_by) : 'Staff',
    description: payload.description || String(r.note ?? ''),
    detail: payload.detail,
    costImpact: payload.costImpact,
    cancelFee: payload.cancelFee,
    refund: payload.refund,
  };
}

function changeToInsertRow(bookingId: string, change: BookingChangeInput): Row {
  const payload: ChangePayload = {
    clientId: change.id,
    description: change.description,
    detail: change.detail,
    costImpact: change.costImpact,
    cancelFee: change.cancelFee,
    refund: change.refund,
    time: change.time,
    date: change.date || new Date().toISOString().slice(0, 10),
  };
  return {
    booking_id: bookingId,
    changed_at: new Date().toISOString(),
    changed_by: change.by || 'Staff',
    field_name: change.type,
    old_value: null,
    new_value: JSON.stringify(payload),
    note: change.description,
  };
}

function flattenNestedBookingRows(data: Row[] | null): {
  bookingRows: Row[];
  itineraryRows: Row[];
  activityRows: Row[];
  changeRowsByBooking: Map<string, Row[]>;
  customerNameById: Map<string, string>;
} {
  const bookingRows: Row[] = [];
  const itineraryRows: Row[] = [];
  const activityRows: Row[] = [];
  const changeRowsByBooking = new Map<string, Row[]>();
  const customerNameById = new Map<string, string>();

  for (const raw of data ?? []) {
    const days = (raw.booking_itinerary as Row[] | undefined) ?? [];
    const changes = (raw.booking_changes as Row[] | undefined) ?? [];
    const customer = raw.customers as { name?: string } | null | undefined;
    const {
      booking_itinerary: _itin,
      booking_changes: _chg,
      customers: _cust,
      ...booking
    } = raw;
    void _itin;
    void _chg;
    void _cust;

    const id = String(booking.id);
    bookingRows.push(booking);
    if (customer?.name) customerNameById.set(String(booking.cust_id ?? ''), String(customer.name));

    const changeList = changeRowsByBooking.get(id) ?? [];
    changeList.push(...changes);
    changeRowsByBooking.set(id, changeList);

    for (const day of days) {
      const activities = (day.booking_activities as Row[] | undefined) ?? [];
      const { booking_activities: _acts, ...itin } = day;
      void _acts;
      itineraryRows.push(itin);
      activityRows.push(...activities);
    }
  }

  return {
    bookingRows,
    itineraryRows,
    activityRows,
    changeRowsByBooking,
    customerNameById,
  };
}

function toListItems(
  bookings: Booking[],
  changeRowsByBooking: Map<string, Row[]>,
  customerNameById: Map<string, string>,
): BookingListItem[] {
  return bookings.map((booking) => {
    const changeRows = changeRowsByBooking.get(booking.id) ?? [];
    const changes = changeRows
      .map(rowToBookingChange)
      .sort((a, b) => `${b.date}${b.time ?? ''}`.localeCompare(`${a.date}${a.time ?? ''}`));
    return {
      ...booking,
      changes,
      customerName: customerNameById.get(booking.custId) || booking.custId,
    };
  });
}

const BOOKING_SELECT =
  '*, customers(name), booking_itinerary(*, booking_activities(*)), booking_changes(*)';

async function syncBookingChanges(
  supabase: SupabaseClient,
  bookingId: string,
  changes: BookingChangeInput[],
): Promise<void> {
  const { error: delErr } = await supabase
    .from('booking_changes')
    .delete()
    .eq('booking_id', bookingId);
  if (delErr) throw new BookingRepositoryError(delErr.message);

  if (!changes.length) return;

  const { error: insErr } = await supabase
    .from('booking_changes')
    .insert(changes.map((change) => changeToInsertRow(bookingId, change)));
  if (insErr) throw new BookingRepositoryError(insErr.message);
}

function inputToBooking(input: BookingInput, id: string): Booking {
  return {
    id,
    custId: input.custId,
    leadId: input.leadId,
    tour: input.tour,
    pax: input.pax,
    start: normalizeBookingDateInput(input.start),
    end: normalizeBookingDateInput(input.end),
    total: input.total,
    deposit: Math.min(input.deposit, input.total),
    status: input.status,
    guide: input.guide,
    hotel: input.hotel,
    changes: input.changes,
    guideAlertPending: input.guideAlertPending,
  };
}

export async function listBookingsServer(
  supabase: SupabaseClient,
): Promise<BookingListItem[]> {
  const { data, error } = await supabase
    .from('bookings')
    .select(BOOKING_SELECT)
    .order('id');
  if (error) throw new BookingRepositoryError(error.message);

  const flat = flattenNestedBookingRows((data ?? []) as Row[]);
  const bookings = assembleBookings(
    flat.bookingRows,
    flat.itineraryRows,
    flat.activityRows,
  );
  return toListItems(bookings, flat.changeRowsByBooking, flat.customerNameById);
}

export async function getBookingByIdServer(
  supabase: SupabaseClient,
  id: string,
): Promise<BookingListItem> {
  const { data, error } = await supabase
    .from('bookings')
    .select(BOOKING_SELECT)
    .eq('id', id)
    .maybeSingle();
  if (error) throw new BookingRepositoryError(error.message);
  if (!data) {
    throw new BookingRepositoryError('Không tìm thấy booking.', 'not_found');
  }

  const flat = flattenNestedBookingRows([data as Row]);
  const bookings = assembleBookings(
    flat.bookingRows,
    flat.itineraryRows,
    flat.activityRows,
  );
  const [item] = toListItems(bookings, flat.changeRowsByBooking, flat.customerNameById);
  if (!item) {
    throw new BookingRepositoryError('Không tìm thấy booking.', 'not_found');
  }
  return item;
}

/** Light list for id generation / lead confirm idempotency (no nested children). */
export async function listBookingSummariesServer(
  supabase: SupabaseClient,
): Promise<Booking[]> {
  const { data, error } = await supabase
    .from('bookings')
    .select(
      'id, lead_id, cust_id, tour, pax, start_date, end_date, total, deposit, status, guide_name, hotel, guide_alert_pending',
    );
  if (error) throw new BookingRepositoryError(error.message);

  return ((data ?? []) as Row[]).map((r) => ({
    id: String(r.id),
    custId: String(r.cust_id ?? ''),
    leadId: r.lead_id ? String(r.lead_id) : undefined,
    tour: String(r.tour ?? ''),
    pax: Number(r.pax ?? 1),
    start: r.start_date ? String(r.start_date) : '',
    end: r.end_date ? String(r.end_date) : '',
    total: Number(r.total ?? 0),
    deposit: Number(r.deposit ?? 0),
    status: String(r.status ?? ''),
    guide: String(r.guide_name ?? ''),
    hotel: String(r.hotel ?? ''),
    changes: [],
    guideAlertPending: Boolean(r.guide_alert_pending),
  }));
}

/** Insert a fully built Booking row (used by Sales confirm + Bookings create). */
export async function insertBookingServer(
  supabase: SupabaseClient,
  booking: Booking,
): Promise<BookingListItem> {
  const { error } = await supabase.from('bookings').insert(bookingToRow(booking));
  if (error) throw new BookingRepositoryError(error.message);

  if (booking.changes?.length) {
    await syncBookingChanges(
      supabase,
      booking.id,
      booking.changes as BookingChangeInput[],
    );
  }

  await invalidateDashboardCache();
  return getBookingByIdServer(supabase, booking.id);
}

export async function createBookingServer(
  supabase: SupabaseClient,
  input: BookingInput,
): Promise<BookingListItem> {
  const existing = await listBookingSummariesServer(supabase);
  const id = input.id?.trim() || nextBookingId(existing);
  if (existing.some((b) => b.id === id)) {
    throw new BookingRepositoryError(`Booking id ${id} đã tồn tại.`, 'conflict');
  }

  const booking = inputToBooking(input, id);
  return insertBookingServer(supabase, booking);
}

export async function updateBookingServer(
  supabase: SupabaseClient,
  input: BookingInput & { id: string },
): Promise<BookingListItem> {
  const existing = await getBookingByIdServer(supabase, input.id);
  const booking = inputToBooking(
    {
      ...input,
      leadId: input.leadId ?? existing.leadId,
    },
    input.id,
  );

  const { data, error } = await supabase
    .from('bookings')
    .update(bookingToRow(booking))
    .eq('id', input.id)
    .select('id')
    .maybeSingle();
  if (error) throw new BookingRepositoryError(error.message);
  if (!data) {
    throw new BookingRepositoryError('Không tìm thấy booking.', 'not_found');
  }

  await syncBookingChanges(supabase, input.id, input.changes ?? []);
  await invalidateDashboardCache();
  return getBookingByIdServer(supabase, input.id);
}
