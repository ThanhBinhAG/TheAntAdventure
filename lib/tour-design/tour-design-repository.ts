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

/** Save the draft and replacement outline as one PostgreSQL transaction. */
export async function saveTourDesignServer(
  supabase: SupabaseClient,
  draft: TourDraft,
  outlineDays: TourOutlineDay[]
): Promise<void> {
  const { error } = await supabase.rpc('save_tour_design_transaction', {
    p_draft: tourDraftToRow(draft),
    p_outline_days: outlineDays.map((day) => tourOutlineDayToRow(day)),
  });
  if (error) throw error;
}
