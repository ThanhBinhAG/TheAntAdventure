import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';
import { getPhotoStorageClient } from '@/lib/storage/upload-gallery-photo-server';
import { PHOTOS_BUCKET } from '@/lib/storage/photo-paths';

export type PhotosBucketDownloadResult = {
  data: Blob;
  contentType: string;
};

export async function downloadPhotosBucketObject(
  path: string,
  client?: SupabaseClient | null,
): Promise<PhotosBucketDownloadResult | null> {
  const storageClient = client ?? (await getPhotoStorageClient());
  if (!storageClient) return null;

  const { data, error } = await storageClient.storage.from(PHOTOS_BUCKET).download(path);
  if (error || !data) return null;

  return {
    data,
    contentType: data.type || 'application/octet-stream',
  };
}
