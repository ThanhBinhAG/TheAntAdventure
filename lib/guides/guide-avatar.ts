import 'server-only';

import sharp from 'sharp';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  isLegacyPhotosBucketPublicUrl,
  legacyPublicUrlToStoragePath,
} from '@/lib/gallery/gallery-asset-url';
import { guideAvatarPath, PHOTOS_BUCKET } from '@/lib/storage/photo-paths';
import { guideAvatarApiUrl } from './guide-avatar-url';

const MAX_AVATAR_BYTES = 20 * 1024 * 1024;

const GUIDE_AVATAR_OBJECT_PATH = /^guides\/[^/]+\/avatar\.webp$/;

function isLegacyGuideAvatarUrl(photo: string): boolean {
  if (!photo || photo.startsWith('/api/guides/avatar')) return false;
  const path = legacyPublicUrlToStoragePath(photo);
  if (path && GUIDE_AVATAR_OBJECT_PATH.test(path)) return true;
  if (GUIDE_AVATAR_OBJECT_PATH.test(photo)) return true;
  return (
    isLegacyPhotosBucketPublicUrl(photo) &&
    (photo.includes('/guides/') || photo.includes('%2Fguides%2F'))
  );
}

export function guidePhotoForBrowser(guideId: string, photo: string): string {
  if (!photo) return '';
  if (photo === guideAvatarApiUrl(guideId)) return photo;
  if (photo.startsWith('/api/guides/avatar')) return photo;
  return isLegacyGuideAvatarUrl(photo) ? guideAvatarApiUrl(guideId) : photo;
}

export async function uploadGuideAvatarServer(
  supabase: SupabaseClient,
  guideId: string,
  file: File,
): Promise<string> {
  if (file.size > MAX_AVATAR_BYTES) {
    throw new Error('Avatar image must be 20 MB or smaller.');
  }

  const source = Buffer.from(await file.arrayBuffer());
  const avatar = await sharp(source, { failOn: 'error' })
    .rotate()
    .resize({ width: 256, height: 256, fit: 'cover' })
    .webp({ quality: 80 })
    .toBuffer();
  const path = guideAvatarPath(guideId);
  const { error: uploadError } = await supabase.storage.from(PHOTOS_BUCKET).upload(path, avatar, {
    contentType: 'image/webp',
    upsert: true,
    cacheControl: '31536000',
  });
  if (uploadError) throw new Error(uploadError.message);

  const photo = guideAvatarApiUrl(guideId);
  const { data, error: updateError } = await supabase
    .from('guides')
    .update({ photo_url: photo })
    .eq('id', guideId)
    .select('id')
    .maybeSingle();
  if (updateError) throw new Error(updateError.message);
  if (!data) throw new Error('Guide not found.');
  return photo;
}
