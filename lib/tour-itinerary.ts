import type { Product } from '@/lib/types';

const MONTH_MAP: Record<string, number> = {
  Jan: 0,
  Feb: 1,
  Mar: 2,
  Apr: 3,
  May: 4,
  Jun: 5,
  Jul: 6,
  Aug: 7,
  Sep: 8,
  Oct: 9,
  Nov: 10,
  Dec: 11,
};

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function parseDuration(dur: string): number {
  const d = (dur || '').toLowerCase();
  if (d.includes('service')) return 0;
  const m2 = d.match(/(\d+)\s*d/i);
  if (m2) return parseInt(m2[1], 10);
  if (d.includes('4 days') || d.includes('4d')) return 4;
  if (d.includes('3 days') || d.includes('3d')) return 3;
  if (d.includes('2 days') || d.includes('2d')) return 2;
  if (d.includes('full day') || d === 'full day') return 1;
  if (d.includes('half')) return 0.5;
  if (d.includes('evening')) return 0.5;
  return 0.5;
}

export interface ItineraryDay {
  n: number;
  items: Product[];
  label: string;
  multiDay?: boolean;
  dayOf?: number;
  totalDays?: number;
}

export function buildDayGroups(products: Product[]): ItineraryDay[] {
  const days: ItineraryDay[] = [];
  let dayNum = 1;
  let halfDayBuffer: Product | null = null;

  products.forEach((p) => {
    const dur = parseDuration(p.dur);
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
    } else {
      if (halfDayBuffer) {
        days.push({ n: dayNum++, items: [halfDayBuffer], label: halfDayBuffer.dest || '' });
        halfDayBuffer = null;
      }
      days.push({ n: dayNum++, items: [p], label: p.dest || '' });
    }
  });

  if (halfDayBuffer) {
    days.push({ n: dayNum++, items: [halfDayBuffer], label: halfDayBuffer.dest || '' });
  }

  return days;
}

export function totalDurationDays(products: Product[]): number {
  return products.reduce((s, p) => s + parseDuration(p.dur), 0);
}

export function resolveTravelStart(startDate: string, travelMonth: string): { date: Date | null; isEstimate: boolean } {
  if (startDate) {
    const ts = new Date(startDate + 'T00:00:00');
    if (!isNaN(ts.getTime())) return { date: ts, isEstimate: false };
  }
  if (travelMonth && MONTH_MAP[travelMonth] !== undefined) {
    const now = new Date();
    let yr = now.getFullYear();
    const mIdx = MONTH_MAP[travelMonth];
    if (mIdx < now.getMonth()) yr++;
    return { date: new Date(yr, mIdx, 1), isEstimate: true };
  }
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

export function formatTravelStartTitle(startDate: string, travelMonth: string): string {
  const { date } = resolveTravelStart(startDate, travelMonth);
  if (!date) return '📅 Draft Itinerary — Auto-Generated';
  return `📅 Draft Itinerary — from ${DOW[date.getDay()]}, ${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

export function stripMarkdown(text: string): string {
  return (text || '').replace(/\*\*/g, '');
}
