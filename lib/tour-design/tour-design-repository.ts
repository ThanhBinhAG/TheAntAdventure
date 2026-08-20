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

/**
 * Lưu thông tin tour draft và các ngày hành trình (outlines) tuần tự trên server.
 */
export async function saveTourDesignServer(
  supabase: SupabaseClient,
  draft: TourDraft,
  outlineDays: TourOutlineDay[]
): Promise<void> {
  // 1. Upsert tour draft
  const draftRow = tourDraftToRow(draft);
  const { error: draftError } = await supabase
    .from('tour_drafts')
    .upsert(draftRow);

  if (draftError) throw draftError;

  // 2. Xóa các outline days cũ liên quan đến draftId
  const { error: deleteError } = await supabase
    .from('tour_outline_days')
    .delete()
    .eq('draft_id', draft.id);

  if (deleteError) throw deleteError;

  // 3. Chèn các outline days mới (nếu có)
  if (outlineDays.length > 0) {
    const rows = outlineDays.map((day) => tourOutlineDayToRow(day));
    const { error: insertError } = await supabase
      .from('tour_outline_days')
      .insert(rows);

    if (insertError) throw insertError;
  }
}
