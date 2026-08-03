import { STAGE_ORDER, STAGE_PROB_V22 } from '../constants';
import { mondayWeekRange } from '../core/date-utils';
import { getCustomerName } from '../core/crm-utils';
import type { Customer, Lead } from '../types';

const MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;

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

export type SalesTimeFilterMode =
  | 'all'
  | 'followUpToday'
  | 'followUpWeek'
  | 'overdue'
  | 'travelMonth'
  | 'followUpRange';

export interface SalesTimeFilterState {
  mode: SalesTimeFilterMode;
  travelMonth?: string;
  followUpFrom?: string;
  followUpTo?: string;
}

export type ListSortField = 'weighted' | 'value' | 'travelDate' | 'followUp' | 'stage' | 'customer';
export type SortDirection = 'asc' | 'desc';

export interface ListSortState {
  field: ListSortField;
  direction: SortDirection;
}

export const PIPELINE_CARDS_LIMIT = 8;

/** Normalize legacy month strings to `Mon YYYY` or `TBD`. */
export function normalizeLeadMonth(month: string, year = new Date().getFullYear()): string {
  const trimmed = (month || '').trim();
  if (!trimmed || trimmed === 'TBD') return 'TBD';

  const monYear = trimmed.match(/^([A-Za-z]{3})\s+(\d{4})$/);
  if (monYear && MONTH_MAP[monYear[1]] !== undefined) return `${monYear[1]} ${monYear[2]}`;

  if (/^[A-Za-z]{3}$/.test(trimmed) && MONTH_MAP[trimmed] !== undefined) {
    return `${trimmed} ${year}`;
  }

  const isoMonth = trimmed.match(/^(\d{4})-(\d{2})$/);
  if (isoMonth) {
    const mIdx = parseInt(isoMonth[2], 10) - 1;
    if (mIdx >= 0 && mIdx < 12) return `${MONTH_ABBR[mIdx]} ${isoMonth[1]}`;
  }

  return trimmed;
}

/** Build a lead `month` field from brief/form inputs. */
export function formatLeadTravelMonth(
  travelMonth?: string,
  startDate?: string,
  year = new Date().getFullYear()
): string {
  const fromMonth = (travelMonth || '').trim();
  if (fromMonth) return normalizeLeadMonth(fromMonth, year);

  const fromStart = (startDate || '').trim();
  if (fromStart.length >= 7) {
    const iso = fromStart.slice(0, 7);
    if (/^\d{4}-\d{2}$/.test(iso)) return normalizeLeadMonth(iso, year);
  }

  return 'TBD';
}

export function parseLeadTravelMonth(month: string): number | null {
  const normalized = normalizeLeadMonth(month);
  if (!normalized || normalized === 'TBD') return null;
  const match = normalized.match(/^([A-Za-z]{3})\s+(\d{4})$/);
  if (!match) return null;
  const mIdx = MONTH_MAP[match[1]];
  if (mIdx === undefined) return null;
  return new Date(parseInt(match[2], 10), mIdx, 1).getTime();
}

export function leadMatchesSearch(lead: Lead, query: string, customers: Customer[]): boolean {
  const q = query.toLowerCase().trim();
  if (!q) return true;
  const haystack = [
    lead.id,
    lead.tour,
    lead.owner,
    lead.month,
    lead.notes,
    lead.nextAction,
    getCustomerName(customers, lead.custId),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return haystack.includes(q);
}

export function filterLeadsByTime(leads: Lead[], filter: SalesTimeFilterState, today: string): Lead[] {
  const { mode, travelMonth, followUpFrom, followUpTo } = filter;
  if (mode === 'all') return leads;

  return leads.filter((l) => {
    switch (mode) {
      case 'followUpToday':
        return l.followUpDate === today;
      case 'followUpWeek': {
        if (!l.followUpDate) return false;
        const { start, end } = mondayWeekRange(today);
        return l.followUpDate >= start && l.followUpDate <= end;
      }
      case 'overdue':
        return isFollowUpOverdue(l, today);
      case 'travelMonth':
        if (!travelMonth) return false;
        return normalizeLeadMonth(l.month || '') === normalizeLeadMonth(travelMonth);
      case 'followUpRange': {
        if (!l.followUpDate || !followUpFrom || !followUpTo) return false;
        const from = followUpFrom <= followUpTo ? followUpFrom : followUpTo;
        const to = followUpFrom <= followUpTo ? followUpTo : followUpFrom;
        return l.followUpDate >= from && l.followUpDate <= to;
      }
      default:
        return true;
    }
  });
}

export function getUniqueTravelMonths(leads: Lead[]): string[] {
  const months = new Set<string>();
  for (const l of leads) {
    const norm = normalizeLeadMonth(l.month || '');
    if (norm !== 'TBD') months.add(norm);
  }
  return Array.from(months).sort((a, b) => {
    const ta = parseLeadTravelMonth(a) ?? Infinity;
    const tb = parseLeadTravelMonth(b) ?? Infinity;
    return ta - tb;
  });
}

export function getLeadWeightedValue(lead: Lead): number {
  const prob = lead.probability ?? STAGE_PROB_V22[lead.stage] ?? 10;
  return ((lead.value || 0) * prob) / 100;
}

function stageOrderIndex(stage: string): number {
  const idx = STAGE_ORDER.indexOf(stage as (typeof STAGE_ORDER)[number]);
  return idx >= 0 ? idx : STAGE_ORDER.length;
}

function compareNullable<T>(
  a: T | null,
  b: T | null,
  dir: SortDirection,
  compare: (x: T, y: T) => number
): number {
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  const cmp = compare(a, b);
  return dir === 'asc' ? cmp : -cmp;
}

export function sortLeads(leads: Lead[], sort: ListSortState, customers: Customer[]): Lead[] {
  const { field, direction } = sort;
  return [...leads].sort((a, b) => {
    switch (field) {
      case 'weighted':
        return direction === 'asc'
          ? getLeadWeightedValue(a) - getLeadWeightedValue(b)
          : getLeadWeightedValue(b) - getLeadWeightedValue(a);
      case 'value':
        return direction === 'asc' ? (a.value || 0) - (b.value || 0) : (b.value || 0) - (a.value || 0);
      case 'travelDate':
        return compareNullable(parseLeadTravelMonth(a.month || ''), parseLeadTravelMonth(b.month || ''), direction, (x, y) => x - y);
      case 'followUp':
        return compareNullable(a.followUpDate || null, b.followUpDate || null, direction, (x, y) => x.localeCompare(y));
      case 'stage':
        return direction === 'asc'
          ? stageOrderIndex(b.stage) - stageOrderIndex(a.stage)
          : stageOrderIndex(a.stage) - stageOrderIndex(b.stage);
      case 'customer': {
        const nameA = getCustomerName(customers, a.custId).toLowerCase();
        const nameB = getCustomerName(customers, b.custId).toLowerCase();
        return direction === 'asc' ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
      }
      default:
        return 0;
    }
  });
}

export function isFollowUpOverdue(lead: Lead, today: string): boolean {
  return (
    !!lead.followUpDate &&
    lead.followUpDate < today &&
    lead.stage !== 'Lost' &&
    lead.stage !== 'Completed'
  );
}

export function groupLeadsByTravelMonth(leads: Lead[]): { label: string; leads: Lead[] }[] {
  const groups = new Map<string, Lead[]>();
  for (const l of leads) {
    const norm = normalizeLeadMonth(l.month || '');
    const label = norm !== 'TBD' ? norm : '__tbd__';
    if (!groups.has(label)) groups.set(label, []);
    groups.get(label)!.push(l);
  }
  return Array.from(groups.entries())
    .sort(([a], [b]) => {
      if (a === '__tbd__') return 1;
      if (b === '__tbd__') return -1;
      return (parseLeadTravelMonth(a) ?? Infinity) - (parseLeadTravelMonth(b) ?? Infinity);
    })
    .map(([key, items]) => ({
      label: key === '__tbd__' ? 'TBD' : key,
      leads: items,
    }));
}

export function hasActiveFilters(
  search: string,
  timeFilter: SalesTimeFilterState,
  stageFilter: string
): boolean {
  return (
    !!search.trim() ||
    timeFilter.mode !== 'all' ||
    !!stageFilter
  );
}
