import type { TourBrief } from './tour-design-types';
import type { OutlineStatus, TourDraft, TourOutlineDay } from './types';

export function tourDraftIdForLead(leadId: string): string {
  return `TD-${leadId}`;
}

export function outlineDaysToRows(days: TourOutlineDay[]) {
  return [...days].sort((a, b) => a.dayNumber - b.dayNumber);
}

export function isIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value.trim());
}

/** Add calendar days to an ISO date (YYYY-MM-DD) without timezone drift. */
export function addDaysToIsoDate(isoDate: string, days: number): string {
  const trimmed = isoDate.trim();
  if (!isIsoDate(trimmed)) return '';
  const [y, m, d] = trimmed.split('-').map(Number);
  const dt = new Date(y, m - 1, d + days);
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const dd = String(dt.getDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

/** Next outline row date: +1 day after the latest dated row, or brief start date for day 1. */
export function nextOutlineDateFromRows(
  rows: TourOutlineDay[],
  fallbackStartDate?: string
): string {
  const sorted = [...rows].sort((a, b) => a.dayNumber - b.dayNumber);
  for (let i = sorted.length - 1; i >= 0; i--) {
    const date = sorted[i].date?.trim() ?? '';
    if (isIsoDate(date)) return addDaysToIsoDate(date, 1);
  }
  const fallback = fallbackStartDate?.trim() ?? '';
  return isIsoDate(fallback) ? fallback : '';
}

export function createEmptyOutlineDay(
  draftId: string,
  dayNumber: number,
  date = ''
): TourOutlineDay {
  const id =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `ol-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  return {
    id,
    draftId,
    dayNumber,
    date,
    location: '',
    activities: '',
    hotels: '',
    sortOrder: dayNumber,
  };
}

export function createOutlineDay(
  draftId: string,
  existingRows: TourOutlineDay[],
  fallbackStartDate?: string
): TourOutlineDay {
  const nextDay = existingRows.length
    ? Math.max(...existingRows.map((r) => r.dayNumber)) + 1
    : 1;
  const date = nextOutlineDateFromRows(existingRows, fallbackStartDate);
  return createEmptyOutlineDay(draftId, nextDay, date);
}

export function buildTourDraft(input: {
  leadId: string;
  custId: string;
  brief: TourBrief;
  outlineStatus: OutlineStatus;
  outlineNotes?: string;
  outlineSentAt?: string;
  outlineApprovedAt?: string;
  outlineRevision?: number;
  selectedCodes: string[];
  selectedPackageId: string | null;
  markupPct: number;
  clientType: 'b2c' | 'b2b';
  currentStep: number;
}): TourDraft {
  return {
    id: tourDraftIdForLead(input.leadId),
    leadId: input.leadId,
    custId: input.custId,
    briefJson: input.brief as unknown as Record<string, unknown>,
    outlineStatus: input.outlineStatus,
    outlineNotes: input.outlineNotes,
    outlineSentAt: input.outlineSentAt,
    outlineApprovedAt: input.outlineApprovedAt,
    outlineRevision: input.outlineRevision ?? 0,
    selectedCodes: input.selectedCodes,
    selectedPackageId: input.selectedPackageId,
    markupPct: input.markupPct,
    clientType: input.clientType,
    currentStep: input.currentStep,
  };
}

export function briefFromDraft(draft?: TourDraft | null): Partial<TourBrief> | undefined {
  if (!draft?.briefJson) return undefined;
  return draft.briefJson as unknown as Partial<TourBrief>;
}
