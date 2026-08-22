import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';
import { getServerSupabaseClient } from '@/lib/supabase/server';
import {
  attractionToRow,
  assembleAttractions,
  attractionPhotoRows,
} from '@/lib/db/mappers/catalogue';
import type { Attraction } from '@/lib/types';

/**
 * Lấy toàn bộ danh sách địa điểm tham quan kèm ảnh từ server.
 */
export async function getAllAttractionsServer(region?: Attraction['region']): Promise<Attraction[]> {
  const supabase = await getServerSupabaseClient();

  let query = supabase
    .from('attractions')
    .select('*')
    .order('name');
  if (region) query = query.eq('region', region);
  const { data: baseRows, error: attError } = await query;
  if (attError) throw attError;

  const attractionIds = (baseRows || []).map((row) => String(row.id));
  if (attractionIds.length === 0) return [];

  // Only fetch links for the attractions selected by the server-side region filter.
  const { data: linkRows, error: photoError } = await supabase
    .from('attraction_photos')
    .select('*')
    .in('attraction_id', attractionIds);
  if (photoError) throw photoError;

  return assembleAttractions(baseRows || [], linkRows || []) as unknown as Attraction[];
}

/**
 * Tạo mới địa điểm tham quan trên server.
 */
export async function createAttractionServer(
  supabase: SupabaseClient,
  attraction: Attraction
): Promise<Attraction> {
  const row = attractionToRow(attraction as unknown as Record<string, unknown>);
  await saveAttractionAggregateServer(supabase, row, attractionPhotoRows(attraction));

  return attraction;
}

/**
 * Cập nhật địa điểm tham quan trên server.
 */
export async function updateAttractionServer(
  supabase: SupabaseClient,
  id: string,
  attraction: Attraction
): Promise<boolean> {
  if (id !== attraction.id) {
    throw new Error('Attraction ID cannot change during update');
  }
  const row = attractionToRow(attraction as unknown as Record<string, unknown>);
  const { error } = await supabase.rpc('update_attraction_aggregate', {
    p_attraction: row,
    p_photo_links: attractionPhotoRows(attraction),
  });
  if (error?.code === 'P0002') return false;
  if (error) throw error;
  return true;
}

async function saveAttractionAggregateServer(
  supabase: SupabaseClient,
  attractionRow: Record<string, unknown>,
  photoLinks: Record<string, unknown>[]
): Promise<void> {
  const { error } = await supabase.rpc('save_attraction_aggregate', {
    p_attraction: attractionRow,
    p_photo_links: photoLinks,
  });
  if (error) throw error;
}

/**
 * Xóa địa điểm tham quan trên server.
 */
export async function deleteAttractionServer(
  supabase: SupabaseClient,
  id: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from('attractions')
    .delete()
    .eq('id', id)
    .select('id');
  if (error) throw error;
  return (data?.length ?? 0) > 0;
}
