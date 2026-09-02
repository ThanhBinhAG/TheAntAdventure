const MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;

export function isIsoTravelMonth(value: string | undefined | null): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test((value || '').trim());
}

/** Keep legacy month-only values unchanged; format new YYYY-MM values for people. */
export function formatTravelMonth(value: string | undefined | null): string {
  const month = (value || '').trim();
  if (!isIsoTravelMonth(month)) return month;
  const [year, monthNumber] = month.split('-');
  return `${MONTH_ABBR[Number(monthNumber) - 1]} ${year}`;
}

export function travelMonthInputValue(value: string | undefined | null): string {
  const month = (value || '').trim();
  return isIsoTravelMonth(month) ? month : '';
}

export function travelMonthToDate(value: string | undefined | null): Date | null {
  if (!isIsoTravelMonth(value)) return null;
  const [year, month] = (value || '').trim().split('-').map(Number);
  return new Date(year, month - 1, 1);
}

export function travelMonthAbbr(value: string | undefined | null): string | null {
  const displayed = formatTravelMonth(value);
  const match = displayed.match(/^([A-Za-z]{3})(?:\s+\d{4})?$/);
  return match && MONTH_ABBR.includes(match[1] as (typeof MONTH_ABBR)[number]) ? match[1] : null;
}
