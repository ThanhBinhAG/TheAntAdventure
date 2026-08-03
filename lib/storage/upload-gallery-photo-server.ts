import 'server-only';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getSupabaseAnonKey, getSupabaseServiceRoleKey, getSupabaseUrl } from '@/lib/env';
import {
  galleryDeleteCandidatePaths,
  galleryDisplayPath,
  galleryThumbPath,
  PHOTOS_BUCKET,
} from '@/lib/storage/photo-paths';
import { processImageVariantsSharp } from '@/lib/storage/photo-variants-sharp';
import { appLog } from '@/lib/system/app-logger';

export type GalleryUploadResult = {
  url: string;
  thumbUrl: string;
  storagePath: string;
  displayBytes: number;
};

function getServiceClient(): SupabaseClient | null {
  const url = getSupabaseUrl();
  const key = getSupabaseServiceRoleKey();
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Prefer service role for Storage writes; fall back to user session cookies. */
export async function getPhotoStorageClient(): Promise<SupabaseClient | null> {
  const service = getServiceClient();
  if (service) return service;

  const url = getSupabaseUrl();
  const key = getSupabaseAnonKey();
  if (!url || !key) return null;

  const cookieStore = cookies();
  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll() {
        /* read-only in route handlers that don't mutate cookies */
      },
    },
  });
}

function publicUrl(client: SupabaseClient, path: string): string {
  const { data } = client.storage.from(PHOTOS_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

async function uploadBuffer(
  client: SupabaseClient,
  path: string,
  buffer: Buffer
): Promise<void> {
  const { error } = await client.storage.from(PHOTOS_BUCKET).upload(path, buffer, {
    contentType: 'image/webp',
    upsert: true,
  });
  if (error) throw new Error(error.message);
}

export async function uploadGalleryPhotoServer(
  client: SupabaseClient,
  photoId: string,
  input: Buffer,
  mime: string
): Promise<GalleryUploadResult> {
  const { thumb, display, displayBytes } = await processImageVariantsSharp(input, mime);
  const displayPath = galleryDisplayPath(photoId);
  const thumbPath = galleryThumbPath(photoId);

  await uploadBuffer(client, displayPath, display);
  try {
    await uploadBuffer(client, thumbPath, thumb);
  } catch (err) {
    await client.storage.from(PHOTOS_BUCKET).remove([displayPath]);
    throw err;
  }

  return {
    url: publicUrl(client, displayPath),
    thumbUrl: publicUrl(client, thumbPath),
    storagePath: displayPath,
    displayBytes,
  };
}

export async function deleteGalleryPhotoFilesServer(
  client: SupabaseClient,
  photoId: string,
  storagePath?: string | null
): Promise<void> {
  const paths = galleryDeleteCandidatePaths(photoId, storagePath);
  const { error } = await client.storage.from(PHOTOS_BUCKET).remove(paths);
  if (error) {
    appLog('storage', 'deleteGalleryPhotoFilesServer failed', {
      level: 'warn',
      meta: { photoId, error: error.message },
    });
  }
}
