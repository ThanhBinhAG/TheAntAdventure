import type { SupabaseClient } from '@supabase/supabase-js';
import { guideAvatarPath, PHOTOS_BUCKET } from '@/lib/storage/photo-paths';
import { processAvatarVariant } from '@/lib/storage/photo-variants';

export async function uploadGuideAvatar(
  supabase: SupabaseClient,
  guideId: string,
  file: File
): Promise<string> {
  const avatar = await processAvatarVariant(file);
  const path = guideAvatarPath(guideId);
  const { error } = await supabase.storage.from(PHOTOS_BUCKET).upload(path, avatar, {
    contentType: 'image/webp',
    upsert: true,
  });
  if (error) throw new Error(error.message);
  const { data } = supabase.storage.from(PHOTOS_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
