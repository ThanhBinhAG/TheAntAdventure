const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Trim and treat legacy `TBD` / blank as empty (UI-only label). */
export function normalizeBookingDateInput(value: string | undefined | null): string {
  const trimmed = (value ?? '').trim();
  if (!trimmed || trimmed.toUpperCase() === 'TBD') return '';
  return trimmed;
}

/** Empty is valid (optional travel dates); otherwise must be ISO `YYYY-MM-DD`. */
export function isValidBookingDate(value: string): boolean {
  const normalized = normalizeBookingDateInput(value);
  if (!normalized) return true;
  if (!ISO_DATE_RE.test(normalized)) return false;
  const [y, m, d] = normalized.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === normalized;
}

/** Map domain date string to Postgres `date` column (null when unset). */
export function bookingDateForDb(value: string | undefined | null): string | null {
  const normalized = normalizeBookingDateInput(value);
  if (!normalized) return null;
  return isValidBookingDate(normalized) ? normalized : null;
}

function formatIsoDateLabel(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

/** Human-readable travel window for tables and detail header. */
export function formatBookingTravelLabel(start: string, end: string): string {
  const s = normalizeBookingDateInput(start);
  const e = normalizeBookingDateInput(end);
  if (!s && !e) return 'TBD';
  if (s && e) return `${formatIsoDateLabel(s)} – ${formatIsoDateLabel(e)}`;
  if (s) return formatIsoDateLabel(s);
  return formatIsoDateLabel(e);
}
