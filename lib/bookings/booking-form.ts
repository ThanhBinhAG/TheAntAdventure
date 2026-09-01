import { parseMoneyInput } from '@/lib/core/money';
import { isValidBookingDate, normalizeBookingDateInput } from '@/lib/bookings/booking-dates';

export type BookingFormData = {
  custId: string;
  tour: string;
  pax: number;
  start: string;
  end: string;
  status: string;
  guide: string;
  hotel: string;
};

export type BookingFormErrorField =
  | 'custId'
  | 'tour'
  | 'pax'
  | 'start'
  | 'end'
  | 'total'
  | 'deposit';

export const EMPTY_BOOKING_FORM: BookingFormData = {
  custId: '',
  tour: '',
  pax: 2,
  start: '',
  end: '',
  status: 'Confirmed',
  guide: '',
  hotel: '',
};

export type BookingFormErrorKey =
  | 'errSelectCustomer'
  | 'errTourRequired'
  | 'errPaxMin'
  | 'errStartDate'
  | 'errEndDate'
  | 'errEndBeforeStart';

export type BookingFormValidationResult =
  | { ok: true; total: number; deposit: number; start: string; end: string }
  | { ok: false; field: BookingFormErrorField | null; errorKey: BookingFormErrorKey };

export function validateBookingForm(
  form: BookingFormData,
  totalInput: string,
  depositInput: string,
): BookingFormValidationResult {
  if (!form.custId.trim()) {
    return { ok: false, field: 'custId', errorKey: 'errSelectCustomer' };
  }
  if (!form.tour.trim()) {
    return { ok: false, field: 'tour', errorKey: 'errTourRequired' };
  }
  if (!Number.isFinite(form.pax) || form.pax < 1) {
    return { ok: false, field: 'pax', errorKey: 'errPaxMin' };
  }

  const start = normalizeBookingDateInput(form.start);
  const end = normalizeBookingDateInput(form.end);

  if (!isValidBookingDate(start)) {
    return { ok: false, field: 'start', errorKey: 'errStartDate' };
  }
  if (!isValidBookingDate(end)) {
    return { ok: false, field: 'end', errorKey: 'errEndDate' };
  }
  if (start && end && end < start) {
    return { ok: false, field: 'end', errorKey: 'errEndBeforeStart' };
  }

  const total = parseMoneyInput(totalInput, { absolute: true });
  let deposit = parseMoneyInput(depositInput, { absolute: true });
  if (deposit > total) deposit = total;

  return { ok: true, total, deposit, start, end };
}
