import type { SupabaseClient } from '@supabase/supabase-js';
import {
  galleryDeleteCandidatePaths,
  galleryDisplayPath,
  galleryThumbPath,
  type GalleryPhotoOwner,
  PHOTOS_BUCKET,
} from '@/lib/storage/photo-paths';
import { processImageVariants } from '@/lib/storage/photo-variants';
import { appLog } from '@/lib/system/app-logger';

export type GalleryUploadResult = {
  url: string;
  thumbUrl: string;
  storagePath: string;
  displayBytes: number;
};

async function uploadBlob(
  supabase: SupabaseClient,
  path: string,
  blob: File
): Promise<void> {
  const { error } = await supabase.storage.from(PHOTOS_BUCKET).upload(path, blob, {
    contentType: 'image/webp',
    upsert: true,
  });
  if (error) throw new Error(error.message);
}

function publicUrl(supabase: SupabaseClient, path: string): string {
  const { data } = supabase.storage.from(PHOTOS_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export async function uploadGalleryPhoto(
  supabase: SupabaseClient,
  photoId: string,
  file: File,
  owner?: GalleryPhotoOwner
): Promise<GalleryUploadResult> {
  const { thumb, display } = await processImageVariants(file);
  const displayPath = galleryDisplayPath(photoId, owner);
  const thumbPath = galleryThumbPath(photoId, owner);

  await uploadBlob(supabase, displayPath, display);
  try {
    await uploadBlob(supabase, thumbPath, thumb);
  } catch (err) {
    await supabase.storage.from(PHOTOS_BUCKET).remove([displayPath]);
    throw err;
  }

  return {
    url: publicUrl(supabase, displayPath),
    thumbUrl: publicUrl(supabase, thumbPath),
    storagePath: displayPath,
    displayBytes: display.size,
  };
}

export async function deleteGalleryPhotoFiles(
  supabase: SupabaseClient,
  photoId: string,
  owner?: GalleryPhotoOwner
): Promise<void> {
  const paths = galleryDeleteCandidatePaths(photoId, owner);
  const { error } = await supabase.storage.from(PHOTOS_BUCKET).remove(paths);
  if (error) {
    appLog('storage', 'deleteGalleryPhotoFiles failed', {
      level: 'warn',
      meta: { photoId, error: error.message },
    });
  }
}
