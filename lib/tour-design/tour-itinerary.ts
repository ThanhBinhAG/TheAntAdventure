import type { ExperienceOverride, Product } from '@/lib/types';
import { travelMonthToDate } from '@/lib/core/travel-month';

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function isDaylessExperience(dur: string): boolean {
  const d = (dur || '').trim().toLowerCase();
  if (!d || d.includes('service')) return true;
  if (d.includes('full day') || d.includes('half') || d.includes('evening')) return false;
  if (/\d+\s*d/i.test(dur)) return false;
  return true;
}

export function parseDuration(dur: string): number {
  if (isDaylessExperience(dur)) return 0;
  const d = (dur || '').toLowerCase();
  const m2 = d.match(/(\d+)\s*d/i);
  if (m2) return parseInt(m2[1], 10);
  if (d.includes('4 days') || d.includes('4d')) return 4;
  if (d.includes('3 days') || d.includes('3d')) return 3;
  if (d.includes('2 days') || d.includes('2d')) return 2;
  if (d.includes('full day') || d === 'full day') return 1;
  if (d.includes('half')) return 0.5;
  if (d.includes('evening')) return 0.5;
  return 0;
}

/** Duration used for packing: durOverride wins over catalog dur. */
export function effectiveDuration(
  product: Product,
  override?: ExperienceOverride | null
): number {
  if (override?.durOverride === 'half') return 0.5;
  if (override?.durOverride === 'full') return 1;
  return parseDuration(product.dur);
}

/** Infer Full/Half from catalog when no override is set. */
export function inferredPace(product: Product): 'full' | 'half' | null {
  const d = parseDuration(product.dur);
  if (d === 0.5) return 'half';
  if (d === 1) return 'full';
  return null;
}

export interface ItineraryDay {
  n: number;
  items: Product[];
  label: string;
  multiDay?: boolean;
  dayOf?: number;
  totalDays?: number;
}

export interface ItineraryBuildResult {
  addons: Product[];
  days: ItineraryDay[];
}

function buildTimedDayGroups(
  products: Product[],
  overrides: Record<string, ExperienceOverride> = {}
): ItineraryDay[] {
  const days: ItineraryDay[] = [];
  let dayNum = 1;
  let halfDayBuffer: Product | null = null;

  for (const p of products) {
    const dur = effectiveDuration(p, overrides[p.code]);
    if (dur >= 2) {
      if (halfDayBuffer) {
        days.push({ n: dayNum++, items: [halfDayBuffer], label: halfDayBuffer.dest || '' });
        halfDayBuffer = null;
      }
      for (let i = 0; i < dur; i++) {
        days.push({
          n: dayNum++,
          items: [p],
          multiDay: true,
          dayOf: i + 1,
          totalDays: dur,
          label: p.dest || '',
        });
      }
    } else if (dur === 0.5) {
      if (halfDayBuffer) {
        days.push({
          n: dayNum++,
          items: [halfDayBuffer, p],
          label: halfDayBuffer.dest || p.dest || '',
        });
        halfDayBuffer = null;
      } else {
        halfDayBuffer = p;
      }
    } else if (dur === 1) {
      if (halfDayBuffer) {
        days.push({ n: dayNum++, items: [halfDayBuffer], label: halfDayBuffer.dest || '' });
        halfDayBuffer = null;
      }
      days.push({ n: dayNum++, items: [p], label: p.dest || '' });
    }
  }

  if (halfDayBuffer) {
    days.push({ n: dayNum++, items: [halfDayBuffer], label: halfDayBuffer.dest || '' });
  }

  return days;
}

export function buildItinerary(
  products: Product[],
  overrides: Record<string, ExperienceOverride> = {}
): ItineraryBuildResult {
  const addons: Product[] = [];
  const timed: Product[] = [];
  for (const p of products) {
    if (effectiveDuration(p, overrides[p.code]) === 0) {
      addons.push(p);
    } else {
      timed.push(p);
    }
  }
  return { addons, days: buildTimedDayGroups(timed, overrides) };
}

export function buildDayGroups(
  products: Product[],
  overrides: Record<string, ExperienceOverride> = {}
): ItineraryDay[] {
  return buildItinerary(products, overrides).days;
}

export function totalDurationDays(
  products: Product[],
  overrides: Record<string, ExperienceOverride> = {}
): number {
  return products.reduce((s, p) => s + effectiveDuration(p, overrides[p.code]), 0);
}

export function resolveTravelStart(startDate: string, travelMonth: string): { date: Date | null; isEstimate: boolean } {
  if (startDate) {
    const ts = new Date(startDate + 'T00:00:00');
    if (!isNaN(ts.getTime())) return { date: ts, isEstimate: false };
  }
  const monthDate = travelMonthToDate(travelMonth);
  if (monthDate) return { date: monthDate, isEstimate: true };
  return { date: null, isEstimate: false };
}

export function formatDayDateLabel(
  startDate: string,
  travelMonth: string,
  dayN: number,
  multiDay?: { dayOf: number; totalDays: number }
): string {
  const { date, isEstimate } = resolveTravelStart(startDate, travelMonth);
  if (!date) return `Day ${dayN}`;
  const d = new Date(date);
  d.setDate(d.getDate() + dayN - 1);
  const est = isEstimate ? ' (est.)' : '';
  const base = `Day ${dayN} — ${DOW[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}${est}`;
  if (multiDay) return `${base} (${multiDay.dayOf}/${multiDay.totalDays})`;
  return base;
}

/** Compact badge: "Day 2 · Half · Fri, 2 Oct" */
export function formatCompactDayBadge(
  startDate: string,
  travelMonth: string,
  dayN: number,
  opts?: {
    overrideDate?: string;
    pace?: 'full' | 'half' | null;
    isEstimate?: boolean;
  }
): string {
  const paceLabel = opts?.pace === 'half' ? 'Half' : opts?.pace === 'full' ? 'Full' : null;
  let datePart = '';
  if (opts?.overrideDate?.trim()) {
    datePart = formatIsoDateShort(opts.overrideDate.trim());
  } else {
    const { date, isEstimate } = resolveTravelStart(startDate, travelMonth);
    if (date) {
      const d = new Date(date);
      d.setDate(d.getDate() + dayN - 1);
      datePart = `${DOW[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]}`;
      if (isEstimate || opts?.isEstimate) datePart += ' (est.)';
    }
  }
  const parts = [`Day ${dayN}`];
  if (paceLabel) parts.push(paceLabel);
  if (datePart) parts.push(datePart);
  return parts.join(' · ');
}

export function formatTravelStartTitle(startDate: string, travelMonth: string): string {
  const { date } = resolveTravelStart(startDate, travelMonth);
  if (!date) return '📅 Draft Itinerary — Auto-Generated';
  return `📅 Draft Itinerary — from ${DOW[date.getDay()]}, ${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

/** Calendar ISO (YYYY-MM-DD) for itinerary day N from brief start / travel month. */
export function isoDateForDay(startDate: string, travelMonth: string, dayN: number): string {
  const { date } = resolveTravelStart(startDate, travelMonth);
  if (!date) return '';
  const d = new Date(date);
  d.setDate(d.getDate() + dayN - 1);
  const yy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

/** Format YYYY-MM-DD as "Thu, 1 Oct 2026" (for override date labels). */
export function formatIsoDateShort(iso: string): string {
  const trimmed = (iso || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const [y, m, d] = trimmed.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  if (isNaN(dt.getTime())) return trimmed;
  return `${DOW[dt.getDay()]}, ${dt.getDate()} ${MONTHS[dt.getMonth()]} ${dt.getFullYear()}`;
}

/** Display day number: override.dayIndex wins over packed day. */
export function displayDayNumber(
  packedDayN: number,
  override?: ExperienceOverride | null
): number {
  if (typeof override?.dayIndex === 'number' && override.dayIndex >= 1) return override.dayIndex;
  return packedDayN;
}

/** First itinerary day number that includes this product code, or null. */
export function firstDayNumberForProduct(days: ItineraryDay[], code: string): number | null {
  for (const day of days) {
    if (day.items.some((p) => p.code === code)) return day.n;
  }
  return null;
}

export function stripMarkdown(text: string): string {
  return (text || '').replace(/\*\*/g, '');
}
