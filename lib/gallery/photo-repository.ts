import 'server-only';

import { rowToPhoto } from '@/lib/db/mappers';
import { getServerSupabaseClient } from '@/lib/supabase/server';

export async function getAllGalleryPhotosServer() {
  const supabase = await getServerSupabaseClient();
  const { data, error } = await supabase
    .from('photos')
    .select('*, photo_tags(*)');
  if (error) throw error;

  return (data ?? []).map((raw) => {
    const row = { ...(raw as Record<string, unknown>) };
    const tags = Array.isArray(row.photo_tags)
      ? row.photo_tags.map((tag) => String((tag as Record<string, unknown>).tag))
      : [];
    delete row.photo_tags;
    return rowToPhoto(row, tags);
  });
}
