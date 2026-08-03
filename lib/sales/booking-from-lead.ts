import { z } from 'zod';
import type { Booking, Lead } from '../types';

const leadForBookingSchema = z.object({
  id: z.string().min(1),
  custId: z.string().min(1),
  tour: z.string(),
  pax: z.number().int().positive().default(1),
  value: z.number().nonnegative().default(0),
  month: z.string().optional(),
});

export function findBookingForLead(bookings: Booking[], leadId: string): Booking | undefined {
  return bookings.find((b) => b.leadId === leadId);
}

export function nextBookingId(existing: Booking[], year = new Date().getFullYear()): string {
  const yy = String(year).slice(-2);
  const prefix = `BK-20${yy}-`;
  const nums = existing
    .map((b) => b.id)
    .filter((id) => id.startsWith(prefix))
    .map((id) => parseInt(id.slice(prefix.length), 10))
    .filter((n) => !Number.isNaN(n));
  const next = (nums.length ? Math.max(...nums) : 0) + 1;
  return `${prefix}${String(next).padStart(3, '0')}`;
}

/** Build a Confirmed booking from a pipeline lead (does not check idempotency). */
export function buildBookingFromLead(lead: Lead, existingBookings: Booking[]): Booking {
  const parsed = leadForBookingSchema.parse({
    id: lead.id,
    custId: lead.custId,
    tour: lead.tour || 'Tour',
    pax: lead.pax || 1,
    value: lead.value || 0,
    month: lead.month,
  });
  const total = parsed.value;
  const deposit = Math.round(total * 0.3);
  return {
    id: nextBookingId(existingBookings),
    custId: parsed.custId,
    leadId: parsed.id,
    tour: parsed.tour,
    pax: parsed.pax,
    start: parsed.month?.trim() || 'TBD',
    end: 'TBD',
    total,
    deposit,
    status: 'Confirmed',
    guide: '—',
    hotel: '',
    changes: [],
    guideAlertPending: false,
  };
}

/**
 * Ensure a Confirmed lead has exactly one linked booking.
 * Returns the new booking to add, or null if one already exists for this leadId.
 */
export function ensureBookingForConfirmedLead(
  lead: Lead,
  bookings: Booking[]
): Booking | null {
  if (findBookingForLead(bookings, lead.id)) return null;
  return buildBookingFromLead(lead, bookings);
}
