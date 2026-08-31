import type { BookingListItem } from '@/lib/bookings/booking-input';
import type { Customer } from '@/lib/types';
import type { ContractFormData } from '@/lib/contracts/contract-form';

const DEPOSIT_PRESETS = [30, 50, 100] as const;

export function computeTourDurationLabel(start: string, end: string): string {
  if (!start || !end) return '';
  const s = new Date(`${start}T00:00:00`);
  const e = new Date(`${end}T00:00:00`);
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return '';
  const nights = Math.round((e.getTime() - s.getTime()) / 86_400_000);
  if (nights < 0) return '';
  const days = nights + 1;
  return `${days} Days / ${nights} Nights`;
}

export function routeFromBookingItinerary(
  booking: Pick<BookingListItem, 'itinerary'>,
): string {
  if (!booking.itinerary?.length) return '';
  const stops = booking.itinerary
    .map((day) => day.dest?.trim())
    .filter((dest): dest is string => Boolean(dest));
  return [...new Set(stops)].join(' – ');
}

export function depositPctFromBooking(total: number, deposit: number): number {
  if (total <= 0 || deposit <= 0) return 50;
  const raw = Math.round((deposit / total) * 100);
  return DEPOSIT_PRESETS.reduce((best, preset) =>
    Math.abs(preset - raw) < Math.abs(best - raw) ? preset : best,
  );
}

export function suggestRoomsForPax(pax: number): string {
  if (pax <= 1) return '1 SGL';
  if (pax === 2) return '1 DBL';
  if (pax <= 4) return '1 DBL + 1 TWN';
  return `${Math.ceil(pax / 2)} rooms`;
}

export function findCustomerForBooking(
  booking: Pick<BookingListItem, 'custId'>,
  customers: Customer[],
): Customer | undefined {
  return customers.find((c) => c.id === booking.custId);
}

/** Map a linked booking (+ optional customer row) into contract form fields. */
export function buildContractFormFromBooking(
  booking: BookingListItem,
  customer?: Customer | null,
): Partial<ContractFormData> {
  const linkedCustomer = customer ?? undefined;
  const clientName =
    booking.customerName?.trim() ||
    linkedCustomer?.name?.trim() ||
    '';

  return {
    bookingId: booking.id,
    clientName,
    nationality: linkedCustomer?.nat?.trim() || '',
    pax: booking.pax,
    rooms: suggestRoomsForPax(booking.pax),
    tourName: booking.tour,
    duration: computeTourDurationLabel(booking.start, booking.end),
    departureDate: booking.start || '',
    returnDate: booking.end || '',
    route: routeFromBookingItinerary(booking),
    total: booking.total,
    depositPct: depositPctFromBooking(booking.total, booking.deposit),
  };
}

export type ClientNameSuggestion = {
  key: string;
  name: string;
  subtitle: string;
  nationality: string;
};

export function filterClientNameSuggestions(
  query: string,
  customers: Customer[],
  bookings: BookingListItem[],
  limit = 10,
): ClientNameSuggestion[] {
  const q = query.trim().toLowerCase();
  const seen = new Set<string>();
  const out: ClientNameSuggestion[] = [];

  const push = (name: string, subtitle: string, nationality: string, key: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const dedupe = trimmed.toLowerCase();
    if (seen.has(dedupe)) return;
    if (q && !trimmed.toLowerCase().includes(q) && !subtitle.toLowerCase().includes(q)) return;
    seen.add(dedupe);
    out.push({ key, name: trimmed, subtitle, nationality });
  };

  for (const booking of bookings) {
    if (!booking.customerName?.trim()) continue;
    push(
      booking.customerName,
      `${booking.tour} · ${booking.id}`,
      '',
      `booking:${booking.id}`,
    );
    if (out.length >= limit) return out;
  }

  for (const customer of customers) {
    push(
      customer.name,
      customer.id,
      customer.nat?.trim() || '',
      `customer:${customer.id}`,
    );
    if (out.length >= limit) return out;
  }

  return out;
}
