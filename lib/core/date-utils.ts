const DEFAULT_TIMEZONE = 'Asia/Ho_Chi_Minh';

const isoFormatterCache = new Map<string, Intl.DateTimeFormat>();

function getIsoFormatter(timeZone: string): Intl.DateTimeFormat {
  let fmt = isoFormatterCache.get(timeZone);
  if (!fmt) {
    fmt = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' });
    isoFormatterCache.set(timeZone, fmt);
  }
  return fmt;
}

/** Today's date as YYYY-MM-DD in the given timezone (default ICT). */
export function localTodayIso(timeZone = DEFAULT_TIMEZONE): string {
  return localIsoDate(new Date(), timeZone);
}

/** Format a Date as YYYY-MM-DD in the given timezone. */
export function localIsoDate(d: Date, timeZone = DEFAULT_TIMEZONE): string {
  return getIsoFormatter(timeZone).format(d);
}

function parseIsoDate(iso: string): Date {
  return new Date(iso + 'T12:00:00');
}

function addDays(iso: string, days: number): string {
  const d = parseIsoDate(iso);
  d.setDate(d.getDate() + days);
  return localIsoDate(d);
}

export { addDays };

/** Monday–Sunday week range containing `today` (YYYY-MM-DD strings). */
export function mondayWeekRange(today: string): { start: string; end: string } {
  const d = parseIsoDate(today);
  const day = d.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + diffToMonday);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return { start: localIsoDate(monday), end: localIsoDate(sunday) };
}

/** Monday of the week containing `today`. */
export function mondayOfWeek(today: string): string {
  return mondayWeekRange(today).start;
}

/** Seven consecutive ISO dates starting from Monday of the week containing `today`. */
export function weekDaysFromMonday(today: string): string[] {
  const start = mondayOfWeek(today);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

/** ISO date N days before `today`. */
export function daysAgoIso(today: string, days: number, timeZone = DEFAULT_TIMEZONE): string {
  const d = parseIsoDate(today);
  d.setDate(d.getDate() - days);
  return localIsoDate(d, timeZone);
}
