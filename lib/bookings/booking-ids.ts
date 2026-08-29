import type { Booking } from '@/lib/types';

export function nextBookingId(
  existing: Pick<Booking, 'id'>[],
  year = new Date().getFullYear(),
): string {
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
