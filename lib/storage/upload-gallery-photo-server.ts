import 'server-only';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseServiceRoleKey, getSupabaseUrl } from '@/lib/server/env/supabase';
import { getSupabaseGlobalFetchOptions } from '@/lib/supabase/insecure-fetch';
import { getServerSupabaseClient } from '@/lib/supabase/server';
import { pickGalleryProfile } from '@/lib/image-pipeline/profiles';
import {
  processGalleryAssetFromPath,
  type GalleryProcessedAsset,
} from '@/lib/image-pipeline/process';
import {
  galleryDeleteCandidatePaths,
  galleryDisplayPath,
  galleryThumbPath,
  PHOTOS_BUCKET,
} from '@/lib/storage/photo-paths';
import { serverLogger } from '@/lib/system/server-logger';

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
    ...getSupabaseGlobalFetchOptions(),
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Prefer service role for Storage writes; fall back to user session cookies. */
export async function getPhotoStorageClient(): Promise<SupabaseClient | null> {
  const service = getServiceClient();
  if (service) return service;

  return getServerSupabaseClient();
}

function publicUrl(client: SupabaseClient, path: string): string {
  const { data } = client.storage.from(PHOTOS_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

/** Safe to cache for a year: URLs carry `?v=displayBytes` (see `withPhotoCacheBust`). */
const GALLERY_ASSET_CACHE_CONTROL = '31536000';

async function uploadBuffer(
  client: SupabaseClient,
  path: string,
  buffer: Buffer
): Promise<void> {
  const { error } = await client.storage.from(PHOTOS_BUCKET).upload(path, buffer, {
    contentType: 'image/webp',
    upsert: true,
    cacheControl: GALLERY_ASSET_CACHE_CONTROL,
  });
  if (error) throw new Error(error.message);
}

async function uploadVariants(
  client: SupabaseClient,
  photoId: string,
  variants: { thumb: Buffer; display: Buffer; displayBytes: number }
): Promise<GalleryUploadResult> {
  const displayPath = galleryDisplayPath(photoId);
  const thumbPath = galleryThumbPath(photoId);

  try {
    await Promise.all([
      uploadBuffer(client, displayPath, variants.display),
      uploadBuffer(client, thumbPath, variants.thumb),
    ]);
  } catch (err) {
    await client.storage.from(PHOTOS_BUCKET).remove([displayPath, thumbPath]);
    throw err;
  }

  return {
    url: publicUrl(client, displayPath),
    thumbUrl: publicUrl(client, thumbPath),
    storagePath: displayPath,
    displayBytes: variants.displayBytes,
  };
}

export async function uploadGalleryPhotoFromProcessed(
  client: SupabaseClient,
  photoId: string,
  processed: GalleryProcessedAsset
): Promise<GalleryUploadResult> {
  const display = processed.variants.find((v) => v.name === 'display');
  const thumb = processed.variants.find((v) => v.name === 'thumb');
  if (!display || !thumb) {
    throw new Error('Image processing did not produce the required variants');
  }

  return uploadVariants(client, photoId, {
    display: display.buffer,
    thumb: thumb.buffer,
    displayBytes: display.bytes,
  });
}

/**
 * Sharp runs in a forked child (native OOM stays isolated). Caller should delete the
 * original file from disk before or after this returns if freeing disk early matters.
 */
export async function processGalleryPhotoFromPath(
  filePath: string,
  mime: string,
  sourceBytes: number,
  workDir?: string
): Promise<GalleryProcessedAsset> {
  const profile = pickGalleryProfile(sourceBytes);
  return processGalleryAssetFromPath(filePath, mime, profile, { workDir });
}

export type GalleryPhotoRowPayload = {
  photoId: string;
  caption: string;
  region: string;
  tags: string[];
  folderId: string;
};

export type GalleryPhotoApiRecord = {
  id: string;
  caption: string;
  region: string;
  tags: string[];
  url: string;
  thumbUrl: string;
  storagePath: string;
  displayBytes: number;
  folderId: string;
};

/** Upsert photos + photo_tags after Storage variants are written. */
export async function persistGalleryPhotoRow(
  client: SupabaseClient,
  meta: GalleryPhotoRowPayload,
  uploaded: GalleryUploadResult
): Promise<GalleryPhotoApiRecord> {
  const row = {
    id: meta.photoId,
    caption: meta.caption,
    region: meta.region,
    url: uploaded.url,
    thumb_url: uploaded.thumbUrl,
    storage_path: uploaded.storagePath,
    display_bytes: uploaded.displayBytes,
    folder_id: meta.folderId,
  };

  const { error: upsertErr } = await client.from('photos').upsert(row, { onConflict: 'id' });
  if (upsertErr) {
    await client.storage
      .from(PHOTOS_BUCKET)
      .remove(galleryDeleteCandidatePaths(meta.photoId, uploaded.storagePath));
    throw new Error(upsertErr.message);
  }

  await client.from('photo_tags').delete().eq('photo_id', meta.photoId);
  if (meta.tags.length) {
    const { error: tagErr } = await client.from('photo_tags').insert(
      meta.tags.map((tag) => ({ photo_id: meta.photoId, tag }))
    );
    if (tagErr) throw new Error(tagErr.message);
  }

  return {
    id: meta.photoId,
    caption: meta.caption,
    region: meta.region,
    tags: meta.tags,
    url: uploaded.url,
    thumbUrl: uploaded.thumbUrl,
    storagePath: uploaded.storagePath,
    displayBytes: uploaded.displayBytes,
    folderId: meta.folderId,
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
    serverLogger.warn(
      { scope: 'storage/gallery', event: 'gallery_photo_files.delete_failed', photoId, err: error },
      'Gallery photo file deletion failed'
    );
  }
}
