import type { TourDraft, TourOutlineDay } from '../../types';
import { getExperienceOverridesFromBriefJson } from '../../tour-design/tour-draft-utils';
import { fkOrNull, type Row } from './shared';

export function rowToTourDraft(r: Row): TourDraft {
  const briefJson = (r.brief_json as Record<string, unknown>) ?? undefined;
  const experienceOverrides = getExperienceOverridesFromBriefJson(briefJson);
  return {
    id: String(r.id),
    leadId: String(r.lead_id ?? ''),
    custId: String(r.cust_id ?? ''),
    briefJson,
    outlineStatus: (r.outline_status as TourDraft['outlineStatus']) ?? 'draft',
    outlineNotes: r.outline_notes ? String(r.outline_notes) : undefined,
    outlineSentAt: r.outline_sent_at ? String(r.outline_sent_at) : undefined,
    outlineApprovedAt: r.outline_approved_at ? String(r.outline_approved_at) : undefined,
    outlineRevision: r.outline_revision != null ? Number(r.outline_revision) : undefined,
    saveRevision: r.save_revision != null ? Number(r.save_revision) : 0,
    selectedCodes: Array.isArray(r.selected_codes) ? (r.selected_codes as string[]) : undefined,
    selectedPackageId: r.selected_package_id ? String(r.selected_package_id) : null,
    experienceOverrides: Object.keys(experienceOverrides).length ? experienceOverrides : undefined,
    markupPct: r.markup_pct != null ? Number(r.markup_pct) : undefined,
    clientType: (r.client_type as TourDraft['clientType']) ?? undefined,
    currentStep: r.current_step != null ? Number(r.current_step) : undefined,
  };
}

export function tourDraftToRow(d: TourDraft): Row {
  return {
    id: d.id,
    lead_id: fkOrNull(d.leadId),
    cust_id: fkOrNull(d.custId),
    brief_json: d.briefJson ?? null,
    outline_status: d.outlineStatus ?? 'draft',
    outline_notes: d.outlineNotes ?? null,
    outline_sent_at: d.outlineSentAt ?? null,
    outline_approved_at: d.outlineApprovedAt ?? null,
    outline_revision: d.outlineRevision ?? 0,
    save_revision: d.saveRevision ?? 0,
    selected_codes: d.selectedCodes ?? null,
    selected_package_id: d.selectedPackageId ?? null,
    markup_pct: d.markupPct ?? 30,
    client_type: d.clientType ?? 'b2c',
    current_step: d.currentStep ?? 0,
  };
}

export function rowToTourOutlineDay(r: Row): TourOutlineDay {
  return {
    id: String(r.id),
    draftId: String(r.draft_id ?? ''),
    dayNumber: Number(r.day_number ?? 1),
    date: r.outline_date ? String(r.outline_date) : undefined,
    location: r.location ? String(r.location) : undefined,
    activities: r.activities ? String(r.activities) : undefined,
    hotels: r.hotels ? String(r.hotels) : undefined,
    sortOrder: r.sort_order != null ? Number(r.sort_order) : undefined,
  };
}

export function tourOutlineDayToRow(d: TourOutlineDay): Row {
  return {
    id: d.id,
    draft_id: d.draftId,
    day_number: d.dayNumber,
    outline_date: d.date || null,
    location: d.location ?? null,
    activities: d.activities ?? null,
    hotels: d.hotels ?? null,
    sort_order: d.sortOrder ?? d.dayNumber,
  };
}
