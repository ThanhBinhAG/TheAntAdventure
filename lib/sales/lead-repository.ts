import 'server-only';

import { STAGE_PROB_V22 } from '@/lib/constants';
import {
  bookingToRow,
  commToRow,
  leadToRow,
  rowToLead,
} from '@/lib/db/mappers/crm';
import { rowToTourDraft, rowToTourOutlineDay } from '@/lib/db/mappers/tour';
import type { Row } from '@/lib/db/mappers/shared';
import {
  PIPELINE_LEADS_CAP,
  type LeadListItem,
  type LeadListQuery,
  type LeadPageResponse,
  type LeadPatchBody,
} from '@/lib/sales/lead-list-input';
import {
  buildBookingFromLead,
  findBookingForLead,
} from '@/lib/sales/booking-from-lead';
import {
  filterLeadsByTime,
  getUniqueTravelMonths,
  leadMatchesCustomerNameItem,
  leadMatchesSearchItem,
  sortLeadItems,
  type ListSortState,
  type SalesTimeFilterState,
} from '@/lib/sales/sales-lead-utils';
import { patchOutlineApproved } from '@/lib/tour-design/tour-design-lead';
import { saveTourDesignServer } from '@/lib/tour-design/tour-design-repository';
import { getServerSupabaseClient } from '@/lib/supabase/server';
import type { Booking, Comm, Lead, TourDraft } from '@/lib/types';

export class LeadRepositoryError extends Error {
  constructor(
    message: string,
    readonly code:
      | 'config'
      | 'query'
      | 'not_found'
      | 'validation'
      | 'conflict' = 'query',
  ) {
    super(message);
    this.name = 'LeadRepositoryError';
  }
}

type LeadSupabaseClient = Awaited<ReturnType<typeof createLeadServerClient>>;

async function createLeadServerClient() {
  try {
    return await getServerSupabaseClient();
  } catch (error) {
    throw new LeadRepositoryError(
      error instanceof Error
        ? error.message
        : 'CRM session không hợp lệ hoặc Supabase chưa được cấu hình.',
      'config',
    );
  }
}

function applyLostFields(lead: LeadListItem, patch: LeadPatchBody): Lead {
  const next: Lead = {
    ...lead,
    ...(patch.stage != null ? { stage: patch.stage } : {}),
    ...(patch.probability != null ? { probability: patch.probability } : {}),
    ...(patch.followUpDate !== undefined
      ? { followUpDate: patch.followUpDate ?? undefined }
      : {}),
    ...(patch.nextAction !== undefined
      ? { nextAction: patch.nextAction ?? undefined }
      : {}),
  };
  if (patch.lostReason != null) next.lostReason = patch.lostReason;
  if (patch.lostNote != null) next.lostNote = patch.lostNote;
  if (patch.lostAt != null) next.lostAt = patch.lostAt;
  return next;
}

function toListItem(
  lead: Lead,
  customerName: string,
  outline?: { status: string | null; revision: number | null },
  hasBooking?: boolean,
): LeadListItem {
  return {
    ...lead,
    customerName,
    outlineStatus: (outline?.status as LeadListItem['outlineStatus']) ?? null,
    outlineRevision: outline?.revision ?? undefined,
    hasBooking: hasBooking ?? false,
  };
}

async function fetchLeadRows(supabase: LeadSupabaseClient): Promise<Row[]> {
  const { data, error } = await supabase.from('leads').select('*');
  if (error) throw new LeadRepositoryError(error.message);
  return (data ?? []) as Row[];
}

async function fetchCustomerNames(
  supabase: LeadSupabaseClient,
): Promise<Map<string, string>> {
  const { data, error } = await supabase.from('customers').select('id, name');
  if (error) throw new LeadRepositoryError(error.message);
  const map = new Map<string, string>();
  for (const row of (data ?? []) as Row[]) {
    map.set(String(row.id), String(row.name ?? ''));
  }
  return map;
}

async function fetchDraftMetaByLead(
  supabase: LeadSupabaseClient,
): Promise<Map<string, { status: string | null; revision: number | null }>> {
  const { data, error } = await supabase
    .from('tour_drafts')
    .select('lead_id, outline_status, outline_revision');
  if (error) throw new LeadRepositoryError(error.message);
  const map = new Map<string, { status: string | null; revision: number | null }>();
  for (const row of (data ?? []) as Row[]) {
    const leadId = String(row.lead_id ?? '');
    if (!leadId) continue;
    map.set(leadId, {
      status: row.outline_status ? String(row.outline_status) : null,
      revision: row.outline_revision != null ? Number(row.outline_revision) : null,
    });
  }
  return map;
}

async function fetchBookingLeadIds(
  supabase: LeadSupabaseClient,
): Promise<Set<string>> {
  const { data, error } = await supabase
    .from('bookings')
    .select('lead_id')
    .not('lead_id', 'is', null);
  if (error) throw new LeadRepositoryError(error.message);
  return new Set(
    ((data ?? []) as Row[])
      .map((r) => String(r.lead_id ?? ''))
      .filter(Boolean),
  );
}

async function buildLeadListItems(
  supabase: LeadSupabaseClient,
): Promise<LeadListItem[]> {
  const [leadRows, customerNames, draftMeta, bookingLeadIds] = await Promise.all([
    fetchLeadRows(supabase),
    fetchCustomerNames(supabase),
    fetchDraftMetaByLead(supabase),
    fetchBookingLeadIds(supabase),
  ]);

  return leadRows.map((row) => {
    const lead = rowToLead(row);
    return toListItem(
      lead,
      customerNames.get(lead.custId) ?? lead.custId,
      draftMeta.get(lead.id),
      bookingLeadIds.has(lead.id),
    );
  });
}

function filterItemsForQuery(
  items: LeadListItem[],
  input: LeadListQuery,
  today: string,
): LeadListItem[] {
  const timeFilter: SalesTimeFilterState = {
    mode: input.timeMode,
    travelMonth: input.travelMonth,
    followUpFrom: input.followUpFrom,
    followUpTo: input.followUpTo,
  };

  let list = input.includeLost
    ? [...items]
    : items.filter((l) => l.stage !== 'Lost');

  list = filterLeadsByTime(list, timeFilter, today) as LeadListItem[];

  if (input.stage) {
    list = list.filter((l) => l.stage === input.stage);
  }
  if (input.custId) {
    list = list.filter((l) => l.custId === input.custId);
  }
  if (input.q?.trim()) {
    const q = input.q.trim();
    const matcher =
      input.scope === 'pipeline'
        ? (l: LeadListItem) => leadMatchesCustomerNameItem(l, q)
        : (l: LeadListItem) => leadMatchesSearchItem(l, q);
    list = list.filter(matcher);
  }

  if (input.highlightLeadId) {
    const highlighted = items.find((l) => l.id === input.highlightLeadId);
    if (highlighted && !list.some((l) => l.id === input.highlightLeadId)) {
      list = [highlighted, ...list];
    }
  }

  const sort: ListSortState = {
    field: input.sortField,
    direction: input.sortDirection,
  };
  return sortLeadItems(list, sort);
}

export async function listLeadsPage(input: LeadListQuery): Promise<LeadPageResponse> {
  const supabase = await createLeadServerClient();
  const allItems = await buildLeadListItems(supabase);
  const today = new Date().toISOString().slice(0, 10);
  const travelMonths = getUniqueTravelMonths(allItems);
  const filtered = filterItemsForQuery(allItems, input, today);
  const totalCount = filtered.length;

  if (input.scope === 'pipeline') {
    const capped = filtered.slice(0, PIPELINE_LEADS_CAP);
    return {
      items: capped,
      page: 1,
      pageSize: input.pageSize,
      totalCount,
      totalPages: totalCount === 0 ? 0 : 1,
      hasPreviousPage: false,
      hasNextPage: totalCount > PIPELINE_LEADS_CAP,
      travelMonths,
    };
  }

  const totalPages =
    totalCount === 0 ? 0 : Math.ceil(totalCount / input.pageSize);
  const from = (input.page - 1) * input.pageSize;
  const pageItems = filtered.slice(from, from + input.pageSize);

  return {
    items: pageItems,
    page: input.page,
    pageSize: input.pageSize,
    totalCount,
    totalPages,
    hasPreviousPage: input.page > 1 && totalPages > 0,
    hasNextPage: input.page < totalPages,
    travelMonths,
  };
}

export async function getLeadById(id: string): Promise<LeadListItem> {
  const supabase = await createLeadServerClient();
  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw new LeadRepositoryError(error.message);
  if (!data) {
    throw new LeadRepositoryError('Không tìm thấy lead.', 'not_found');
  }

  const lead = rowToLead(data as Row);
  const [customerNames, draftMeta, bookingLeadIds] = await Promise.all([
    fetchCustomerNames(supabase),
    fetchDraftMetaByLead(supabase),
    fetchBookingLeadIds(supabase),
  ]);

  return toListItem(
    lead,
    customerNames.get(lead.custId) ?? lead.custId,
    draftMeta.get(lead.id),
    bookingLeadIds.has(lead.id),
  );
}

export async function updateLeadRecord(
  id: string,
  patch: LeadPatchBody,
): Promise<LeadListItem> {
  const supabase = await createLeadServerClient();
  const existing = await getLeadById(id);
  const merged = applyLostFields(existing, patch);

  if (patch.stage && patch.probability == null) {
    merged.probability = STAGE_PROB_V22[patch.stage] ?? merged.probability ?? 10;
  }

  const { error } = await supabase
    .from('leads')
    .update(leadToRow(merged))
    .eq('id', id);

  if (error) throw new LeadRepositoryError(error.message);

  return getLeadById(id);
}

export type ConfirmLeadResult = {
  lead: LeadListItem;
  booking: Booking | null;
};

export async function confirmLead(id: string): Promise<ConfirmLeadResult> {
  const supabase = await createLeadServerClient();
  const existing = await getLeadById(id);

  const leadPatch: LeadPatchBody = {
    stage: 'Confirmed',
    probability: STAGE_PROB_V22.Confirmed,
  };
  const lead = await updateLeadRecord(id, leadPatch);

  const { data: bookingRows, error: bookingErr } = await supabase
    .from('bookings')
    .select('id, lead_id, cust_id, tour, pax, start_date, end_date, total, deposit, status, guide_name, hotel, guide_alert_pending');
  if (bookingErr) throw new LeadRepositoryError(bookingErr.message);

  const existingBookings = ((bookingRows ?? []) as Row[]).map((r) => ({
    id: String(r.id),
    custId: String(r.cust_id ?? ''),
    leadId: r.lead_id ? String(r.lead_id) : undefined,
    tour: String(r.tour ?? ''),
    pax: Number(r.pax ?? 1),
    start: r.start_date ? String(r.start_date) : '',
    end: r.end_date ? String(r.end_date) : '',
    total: Number(r.total ?? 0),
    deposit: Number(r.deposit ?? 0),
    status: String(r.status ?? ''),
    guide: String(r.guide_name ?? ''),
    hotel: String(r.hotel ?? ''),
    changes: [],
    guideAlertPending: Boolean(r.guide_alert_pending),
  })) as Booking[];

  if (findBookingForLead(existingBookings, id)) {
    return { lead, booking: null };
  }

  const booking = buildBookingFromLead(
    { ...existing, stage: 'Confirmed', probability: STAGE_PROB_V22.Confirmed },
    existingBookings,
  );

  const { error: insertErr } = await supabase
    .from('bookings')
    .insert(bookingToRow(booking));
  if (insertErr) throw new LeadRepositoryError(insertErr.message);

  return {
    lead: { ...lead, hasBooking: true },
    booking,
  };
}

export type ApproveOutlineResult = {
  lead: LeadListItem;
  draft: TourDraft;
  comm: Comm;
};

export async function approveLeadOutline(id: string): Promise<ApproveOutlineResult> {
  const supabase = await createLeadServerClient();
  const leadItem = await getLeadById(id);

  const { data: draftRow, error: draftErr } = await supabase
    .from('tour_drafts')
    .select('*')
    .eq('lead_id', id)
    .maybeSingle();

  if (draftErr) throw new LeadRepositoryError(draftErr.message);
  if (!draftRow) {
    throw new LeadRepositoryError('Không tìm thấy tour draft cho lead này.', 'not_found');
  }

  const draft = rowToTourDraft(draftRow as Row);
  if (draft.outlineStatus !== 'sent') {
    throw new LeadRepositoryError(
      'Outline chưa ở trạng thái sent — không thể approve.',
      'validation',
    );
  }

  const { data: outlineRows, error: outlineErr } = await supabase
    .from('tour_outline_days')
    .select('*')
    .eq('draft_id', draft.id)
    .order('day_number');

  if (outlineErr) throw new LeadRepositoryError(outlineErr.message);
  const outlineDays = ((outlineRows ?? []) as Row[]).map(rowToTourOutlineDay);

  const patch = patchOutlineApproved(
    draft,
    leadItem.custId,
    leadItem.customerName,
    leadItem.owner,
  );

  const mergedDraft: TourDraft = { ...draft, ...patch.draft };
  await saveTourDesignServer(
    supabase,
    mergedDraft,
    outlineDays,
    draft.saveRevision ?? 0,
  );

  const leadUpdate = { ...leadItem, ...patch.lead };
  const { error: leadErr } = await supabase
    .from('leads')
    .update(leadToRow(leadUpdate))
    .eq('id', id);
  if (leadErr) throw new LeadRepositoryError(leadErr.message);

  let comm: Comm | undefined;
  if (patch.comm) {
    const { error: commErr } = await supabase.from('comms').insert(commToRow(patch.comm));
    if (commErr) throw new LeadRepositoryError(commErr.message);
    comm = patch.comm;
  }

  if (!comm) {
    throw new LeadRepositoryError('Không thể tạo comm cho outline approve.', 'query');
  }

  const refreshed = await getLeadById(id);
  return {
    lead: {
      ...refreshed,
      outlineStatus: mergedDraft.outlineStatus,
      outlineRevision: mergedDraft.outlineRevision,
    },
    draft: mergedDraft,
    comm,
  };
}
