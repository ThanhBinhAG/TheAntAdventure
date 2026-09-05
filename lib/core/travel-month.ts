const MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;

const ISO_MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;
const ISO_DATE_RE = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

export function isIsoTravelMonth(value: string | undefined | null): boolean {
  return ISO_MONTH_RE.test((value || '').trim());
}

export function isIsoTravelDate(value: string | undefined | null): boolean {
  const raw = (value || '').trim();
  if (!ISO_DATE_RE.test(raw)) return false;
  const [y, m, d] = raw.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
}

/** True when value is ISO month (YYYY-MM) or ISO date (YYYY-MM-DD). */
export function isIsoTravelValue(value: string | undefined | null): boolean {
  return isIsoTravelMonth(value) || isIsoTravelDate(value);
}

/** Keep legacy free-text unchanged; format ISO month/date for people. */
export function formatTravelMonth(value: string | undefined | null): string {
  const raw = (value || '').trim();
  if (isIsoTravelDate(raw)) {
    const [year, monthNumber, day] = raw.split('-').map(Number);
    return `${MONTH_ABBR[monthNumber - 1]} ${day}, ${year}`;
  }
  if (isIsoTravelMonth(raw)) {
    const [year, monthNumber] = raw.split('-');
    return `${MONTH_ABBR[Number(monthNumber) - 1]} ${year}`;
  }
  return raw;
}

/**
 * Value suitable for month-only `<input type="month">` / month pickers.
 * Full dates reduce to YYYY-MM; unknown/legacy → ''.
 */
export function travelMonthInputValue(value: string | undefined | null): string {
  const raw = (value || '').trim();
  if (isIsoTravelDate(raw)) return raw.slice(0, 7);
  return isIsoTravelMonth(raw) ? raw : '';
}

/** Dayjs/DatePicker-friendly ISO date string, or '' when not parseable as ISO month/date. */
export function travelDateInputValue(value: string | undefined | null): string {
  const raw = (value || '').trim();
  if (isIsoTravelDate(raw)) return raw;
  if (isIsoTravelMonth(raw)) return `${raw}-01`;
  return '';
}

export function travelMonthToDate(value: string | undefined | null): Date | null {
  const raw = (value || '').trim();
  if (isIsoTravelDate(raw)) {
    const [year, month, day] = raw.split('-').map(Number);
    return new Date(year, month - 1, day);
  }
  if (isIsoTravelMonth(raw)) {
    const [year, month] = raw.split('-').map(Number);
    return new Date(year, month - 1, 1);
  }
  return null;
}

export function travelMonthAbbr(value: string | undefined | null): string | null {
  const raw = (value || '').trim();
  if (isIsoTravelDate(raw) || isIsoTravelMonth(raw)) {
    const monthNumber = Number(raw.slice(5, 7));
    return MONTH_ABBR[monthNumber - 1] ?? null;
  }
  const displayed = formatTravelMonth(raw);
  const match = displayed.match(/^([A-Za-z]{3})(?:\s+\d{1,2},)?(?:\s+\d{4})?$/);
  return match && MONTH_ABBR.includes(match[1] as (typeof MONTH_ABBR)[number]) ? match[1] : null;
}
