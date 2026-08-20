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

  // 2. Lấy liên kết ảnh trong bảng attraction_photos
  const { data: linkRows, error: photoError } = await supabase
    .from('attraction_photos')
    .select('*');
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
  const { error: attError } = await supabase
    .from('attractions')
    .insert(row);
  if (attError) throw attError;

  // Chèn liên kết ảnh
  const photos = attractionPhotoRows(attraction);
  if (photos.length > 0) {
    const { error: photoError } = await supabase
      .from('attraction_photos')
      .insert(photos);
    if (photoError) throw photoError;
  }

  return attraction;
}

/**
 * Cập nhật địa điểm tham quan trên server.
 */
export async function updateAttractionServer(
  supabase: SupabaseClient,
  id: string,
  attraction: Attraction
): Promise<void> {
  const row = attractionToRow(attraction as unknown as Record<string, unknown>);
  const { error: attError } = await supabase
    .from('attractions')
    .update(row)
    .eq('id', id);
  if (attError) throw attError;

  // Cập nhật liên kết ảnh: Xóa liên kết cũ và chèn lại liên kết mới
  const { error: deleteError } = await supabase
    .from('attraction_photos')
    .delete()
    .eq('attraction_id', id);
  if (deleteError) throw deleteError;

  const photos = attractionPhotoRows(attraction);
  if (photos.length > 0) {
    const { error: photoError } = await supabase
      .from('attraction_photos')
      .insert(photos);
    if (photoError) throw photoError;
  }
}

/**
 * Xóa địa điểm tham quan trên server.
 */
export async function deleteAttractionServer(
  supabase: SupabaseClient,
  id: string
): Promise<void> {
  const { error } = await supabase
    .from('attractions')
    .delete()
    .eq('id', id);
  if (error) throw error;
}
