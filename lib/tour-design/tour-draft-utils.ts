import type { TourBrief } from './tour-design-types';
import type { ExperienceOverride, OutlineStatus, TourDraft, TourOutlineDay } from '../types';

export const EXPERIENCE_OVERRIDES_KEY = '__experienceOverrides';

export function getExperienceOverridesFromBriefJson(
  briefJson?: Record<string, unknown> | null
): Record<string, ExperienceOverride> {
  if (!briefJson) return {};
  const raw = briefJson[EXPERIENCE_OVERRIDES_KEY];
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const out: Record<string, ExperienceOverride> = {};
  for (const [code, val] of Object.entries(raw as Record<string, unknown>)) {
    if (!val || typeof val !== 'object' || Array.isArray(val)) continue;
    const o = val as Record<string, unknown>;
    const patch: ExperienceOverride = {};
    if (typeof o.desc === 'string') patch.desc = o.desc;
    if (typeof o.date === 'string') patch.date = o.date;
    if (typeof o.clientNote === 'string') patch.clientNote = o.clientNote;
    if (typeof o.dayIndex === 'number' && Number.isFinite(o.dayIndex) && o.dayIndex >= 1) {
      patch.dayIndex = Math.floor(o.dayIndex);
    }
    if (o.durOverride === 'full' || o.durOverride === 'half') patch.durOverride = o.durOverride;
    if (
      patch.desc !== undefined ||
      patch.date !== undefined ||
      patch.clientNote !== undefined ||
      patch.dayIndex !== undefined ||
      patch.durOverride !== undefined
    ) {
      out[code] = patch;
    }
  }
  return out;
}

export function mergeExperienceOverridesIntoBriefJson(
  brief: TourBrief | Record<string, unknown>,
  overrides: Record<string, ExperienceOverride>
): Record<string, unknown> {
  const base = { ...(brief as Record<string, unknown>) };
  const cleaned: Record<string, ExperienceOverride> = {};
  for (const [code, o] of Object.entries(overrides)) {
    const patch: ExperienceOverride = {};
    if (o.desc?.trim()) patch.desc = o.desc;
    if (o.date?.trim()) patch.date = o.date.trim();
    if (o.clientNote?.trim()) patch.clientNote = o.clientNote;
    if (typeof o.dayIndex === 'number' && Number.isFinite(o.dayIndex) && o.dayIndex >= 1) {
      patch.dayIndex = Math.floor(o.dayIndex);
    }
    if (o.durOverride === 'full' || o.durOverride === 'half') patch.durOverride = o.durOverride;
    if (
      patch.desc !== undefined ||
      patch.date !== undefined ||
      patch.clientNote !== undefined ||
      patch.dayIndex !== undefined ||
      patch.durOverride !== undefined
    ) {
      cleaned[code] = patch;
    }
  }
  if (Object.keys(cleaned).length === 0) {
    delete base[EXPERIENCE_OVERRIDES_KEY];
  } else {
    base[EXPERIENCE_OVERRIDES_KEY] = cleaned;
  }
  return base;
}

export function resolveExperienceOverrides(
  draft?: TourDraft | null
): Record<string, ExperienceOverride> {
  if (!draft) return {};
  if (draft.experienceOverrides && Object.keys(draft.experienceOverrides).length) {
    return { ...draft.experienceOverrides };
  }
  return getExperienceOverridesFromBriefJson(draft.briefJson);
}

export function tourDraftIdForLead(leadId: string): string {
  return `TD-${leadId}`;
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
  experienceOverrides?: Record<string, ExperienceOverride>;
}): TourDraft {
  const experienceOverrides = input.experienceOverrides ?? {};
  return {
    id: tourDraftIdForLead(input.leadId),
    leadId: input.leadId,
    custId: input.custId,
    briefJson: mergeExperienceOverridesIntoBriefJson(input.brief, experienceOverrides),
    outlineStatus: input.outlineStatus,
    outlineNotes: input.outlineNotes,
    outlineSentAt: input.outlineSentAt,
    outlineApprovedAt: input.outlineApprovedAt,
    outlineRevision: input.outlineRevision ?? 0,
    selectedCodes: input.selectedCodes,
    selectedPackageId: input.selectedPackageId,
    experienceOverrides,
    markupPct: input.markupPct,
    clientType: input.clientType,
    currentStep: input.currentStep,
  };
}

export function briefFromDraft(draft?: TourDraft | null): Partial<TourBrief> | undefined {
  if (!draft?.briefJson) return undefined;
  const brief = { ...draft.briefJson };
  delete brief[EXPERIENCE_OVERRIDES_KEY];
  return brief as unknown as Partial<TourBrief>;
}
