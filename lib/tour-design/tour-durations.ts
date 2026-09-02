/** Inclusive tour duration calculated from confirmed start and end dates. */

export type TourDuration = {
  days: number;
  nights: number;
  label: string;
};

export function formatDurationLabel(days: number): string {
  const nights = days - 1;
  const dayLabel = days === 1 ? 'Day' : 'Days';
  const nightLabel = nights === 1 ? 'Night' : 'Nights';
  return `${days} ${dayLabel} ${nights} ${nightLabel}`;
}

function dateAtUtcMidnight(value: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const [, year, month, day] = match.map(Number);
  const timestamp = Date.UTC(year, month - 1, day);
  const date = new Date(timestamp);
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return timestamp;
}

export function calculateTourDuration(startDate: string, endDate: string): TourDuration | null {
  const start = dateAtUtcMidnight(startDate);
  const end = dateAtUtcMidnight(endDate);
  if (start === null || end === null || end < start) return null;
  const days = Math.floor((end - start) / 86_400_000) + 1;
  return { days, nights: days - 1, label: formatDurationLabel(days) };
}
