import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';
import { rowToCustomer, rowToLead } from '@/lib/db/mappers/crm';
import type { Row } from '@/lib/db/mappers/shared';
import {
  rowToTourDraft,
  tourDraftToRow,
  rowToTourOutlineDay,
  tourOutlineDayToRow,
} from '@/lib/db/mappers/tour';
import type { Lead, TourDraft, TourOutlineDay } from '@/lib/types';
import type { TourDesignCrmContext } from '@/lib/tour-design/tour-design-types';

/** Customers + leads for Client Brief dropdown and Sales → Tour Design handoff queue. */
export async function getTourDesignCrmContextServer(
  supabase: SupabaseClient,
): Promise<TourDesignCrmContext> {
  const [customersRes, leadsRes] = await Promise.all([
    supabase.from('customers').select('*'),
    supabase.from('leads').select('*'),
  ]);

  if (customersRes.error) throw customersRes.error;
  if (leadsRes.error) throw leadsRes.error;

  return {
    customers: ((customersRes.data ?? []) as Row[]).map(rowToCustomer),
    leads: ((leadsRes.data ?? []) as Row[]).map(rowToLead),
  };
}

export type TourDesignAcknowledgement = {
  acknowledged: boolean;
  lead: Lead | null;
};

/**
 * Mark a Sales handoff as received exactly once. The predicate makes repeated
 * or concurrent requests a harmless no-op after the first Pending lead update.
 */
export async function acknowledgeTourDesignLeadServer(
  supabase: SupabaseClient,
  leadId: string,
): Promise<TourDesignAcknowledgement> {
  const { data, error } = await supabase
    .from('leads')
    .update({ tour_design_acked: true })
    .eq('id', leadId)
    .eq('needs_tour_design', true)
    .eq('tour_design_acked', false)
    .eq('stage', 'Pending')
    .select('*')
    .maybeSingle();
  if (error) throw error;

  if (data) {
    return { acknowledged: true, lead: rowToLead(data as Row) };
  }

  const { data: current, error: currentError } = await supabase
    .from('leads')
    .select('*')
    .eq('id', leadId)
    .maybeSingle();
  if (currentError) throw currentError;

  return {
    acknowledged: false,
    lead: current ? rowToLead(current as Row) : null,
  };
}

export class TourDesignSaveConflictError extends Error {
  constructor(readonly currentSaveRevision?: number) {
    super('Thiết kế tour đã được thay đổi bởi một lượt lưu mới hơn.');
    this.name = 'TourDesignSaveConflictError';
  }
}

function currentSaveRevisionFromRpcError(error: unknown): number | undefined {
  if (!error || typeof error !== 'object') return undefined;
  const details = 'details' in error ? error.details : undefined;
  if (typeof details !== 'string') return undefined;
  const match = /^current_save_revision=(\d+)$/.exec(details);
  return match ? Number(match[1]) : undefined;
}

function isSaveConflict(error: unknown): boolean {
  return Boolean(error && typeof error === 'object' && 'code' in error && error.code === 'P0001');
}

/**
 * Lấy toàn bộ danh sách tour drafts từ server.
 */
export async function getAllTourDraftsServer(supabase: SupabaseClient): Promise<TourDraft[]> {
  const { data, error } = await supabase
    .from('tour_drafts')
    .select('*');

  if (error) throw error;
  return (data || []).map((row) => rowToTourDraft(row));
}

/**
 * Lấy toàn bộ danh sách các ngày hành trình (outlines) từ server.
 */
export async function getAllTourOutlineDaysServer(
  supabase: SupabaseClient,
): Promise<TourOutlineDay[]> {
  const { data, error } = await supabase
    .from('tour_outline_days')
    .select('*')
    .order('day_number');

  if (error) throw error;
  return (data || []).map((row) => rowToTourOutlineDay(row));
}

/** Read one draft when a user opens its Tour Design session. */
export async function getTourDraftByIdServer(
  supabase: SupabaseClient,
  draftId: string
): Promise<TourDraft | null> {
  const { data, error } = await supabase
    .from('tour_drafts')
    .select('*')
    .eq('id', draftId)
    .maybeSingle();
  if (error) throw error;
  return data ? rowToTourDraft(data) : null;
}

/** Read only drafts connected to the currently available leads. */
export async function getTourDraftsForLeadsServer(
  supabase: SupabaseClient,
  leadIds: string[]
): Promise<TourDraft[]> {
  if (leadIds.length === 0) return [];
  const { data, error } = await supabase
    .from('tour_drafts')
    .select('*')
    .in('lead_id', leadIds);
  if (error) throw error;
  return (data ?? []).map(rowToTourDraft);
}

/** Load outlines only for the draft currently being viewed. */
export async function getTourOutlineDaysForDraftServer(
  supabase: SupabaseClient,
  draftId: string
): Promise<TourOutlineDay[]> {
  const { data, error } = await supabase
    .from('tour_outline_days')
    .select('*')
    .eq('draft_id', draftId)
    .order('day_number');
  if (error) throw error;
  return (data ?? []).map(rowToTourOutlineDay);
}

/** Save the draft and replacement outline as one PostgreSQL transaction. */
export async function saveTourDesignServer(
  supabase: SupabaseClient,
  draft: TourDraft,
  outlineDays: TourOutlineDay[],
  expectedSaveRevision: number
): Promise<number> {
  const { data, error } = await supabase.rpc('save_tour_design_versioned_transaction', {
    p_draft: tourDraftToRow(draft),
    p_outline_days: outlineDays.map((day) => tourOutlineDayToRow(day)),
    p_expected_save_revision: expectedSaveRevision,
  });
  if (error) {
    if (isSaveConflict(error)) {
      throw new TourDesignSaveConflictError(currentSaveRevisionFromRpcError(error));
    }
    throw error;
  }

  const saveRevision = Number(data);
  if (!Number.isInteger(saveRevision) || saveRevision < 1) {
    throw new Error('Tour Design save transaction did not return a valid revision.');
  }
  return saveRevision;
}
