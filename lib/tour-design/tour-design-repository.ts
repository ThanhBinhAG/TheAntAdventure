import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';
import { getServerSupabaseClient } from '@/lib/supabase/server';
import {
  rowToTourDraft,
  tourDraftToRow,
  rowToTourOutlineDay,
  tourOutlineDayToRow,
} from '@/lib/db/mappers/tour';
import type { TourDraft, TourOutlineDay } from '@/lib/types';

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
export async function getAllTourDraftsServer(): Promise<TourDraft[]> {
  const supabase = await getServerSupabaseClient();
  const { data, error } = await supabase
    .from('tour_drafts')
    .select('*');

  if (error) throw error;
  return (data || []).map((row) => rowToTourDraft(row));
}

/**
 * Lấy toàn bộ danh sách các ngày hành trình (outlines) từ server.
 */
export async function getAllTourOutlineDaysServer(): Promise<TourOutlineDay[]> {
  const supabase = await getServerSupabaseClient();
  const { data, error } = await supabase
    .from('tour_outline_days')
    .select('*')
    .order('day_number');

  if (error) throw error;
  return (data || []).map((row) => rowToTourOutlineDay(row));
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
