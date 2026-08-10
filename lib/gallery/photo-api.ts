import type { GalleryPhoto } from '@/lib/tour-design/tour-design-types';
import {
  ALLOWED_IMAGE_MIME,
  GALLERY_CHUNK_BYTES,
  type AllowedImageMime,
} from '@/lib/storage/photo-limits';

export type PhotoUploadMeta = {
  photoId: string;
  caption?: string;
  region?: string;
  tags?: string[];
  folderId?: string;
  /** Optional UI hook while upload / server process runs. */
  onStatus?: (status: string) => void;
  /** Bytes-sent ratio `0..1` after each successful chunk. */
  onProgress?: (p: { ratio: number }) => void;
};

function errMessage(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message.trim()) return err.message;
  if (typeof err === 'string' && err.trim()) return err;
  return fallback;
}

async function readApiJson(res: Response): Promise<{
  ok?: boolean;
  error?: string;
  photo?: GalleryPhoto;
  uploadId?: string;
  chunkBytes?: number;
  totalChunks?: number;
  nextChunkIndex?: number;
  bytesReceived?: number;
}> {
  const text = await res.text();
  try {
    return JSON.parse(text) as {
      ok?: boolean;
      error?: string;
      photo?: GalleryPhoto;
      uploadId?: string;
      chunkBytes?: number;
      totalChunks?: number;
      nextChunkIndex?: number;
      bytesReceived?: number;
    };
  } catch {
    throw new Error(
      res.ok
        ? 'Server returned a non-JSON response'
        : `Upload failed (${res.status}). ${text.slice(0, 160).replace(/\s+/g, ' ')}`
    );
  }
}

function resolveMime(file: File): AllowedImageMime {
  if ((ALLOWED_IMAGE_MIME as readonly string[]).includes(file.type)) {
    return file.type as AllowedImageMime;
  }
  const name = file.name.toLowerCase();
  if (name.endsWith('.png')) return 'image/png';
  if (name.endsWith('.webp')) return 'image/webp';
  return 'image/jpeg';
}

export async function uploadPhotoViaApi(file: File, meta: PhotoUploadMeta): Promise<GalleryPhoto> {
  try {
    meta.onStatus?.('Starting upload…');
    const initRes = await fetch('/api/photos/upload/init', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        photoId: meta.photoId,
        fileName: file.name || 'photo',
        mime: resolveMime(file),
        totalBytes: file.size,
      }),
    });
    const initJson = await readApiJson(initRes);
    if (!initRes.ok || !initJson.ok || !initJson.uploadId) {
      throw new Error(
        (initJson.error && initJson.error.trim()) || `Upload init failed (${initRes.status})`
      );
    }

    const uploadId = initJson.uploadId;
    const chunkBytes = initJson.chunkBytes ?? GALLERY_CHUNK_BYTES;
    const totalChunks = initJson.totalChunks ?? Math.ceil(file.size / chunkBytes);
    const totalBytes = file.size || 1;

    meta.onStatus?.('Uploading…');
    meta.onProgress?.({ ratio: 0 });

    for (let i = 0; i < totalChunks; i++) {
      const start = i * chunkBytes;
      const end = Math.min(start + chunkBytes, file.size);
      const blob = file.slice(start, end);
      const form = new FormData();
      form.set('uploadId', uploadId);
      form.set('chunkIndex', String(i));
      form.set('chunk', blob, `chunk-${i}`);

      const chunkRes = await fetch('/api/photos/upload/chunk', { method: 'POST', body: form });
      const chunkJson = await readApiJson(chunkRes);
      if (!chunkRes.ok || !chunkJson.ok) {
        throw new Error(
          (chunkJson.error && chunkJson.error.trim()) || `Chunk ${i + 1} failed (${chunkRes.status})`
        );
      }
      meta.onProgress?.({ ratio: end / totalBytes });
    }

    meta.onStatus?.('Processing on server…');
    const completeRes = await fetch('/api/photos/upload/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        uploadId,
        photoId: meta.photoId,
        caption: meta.caption ?? '',
        region: meta.region ?? 'north',
        tags: meta.tags ?? [],
        folderId: meta.folderId,
      }),
    });
    const completeJson = await readApiJson(completeRes);
    if (!completeRes.ok || !completeJson.ok || !completeJson.photo) {
      throw new Error(
        (completeJson.error && completeJson.error.trim()) ||
          `Upload complete failed (${completeRes.status})`
      );
    }
    return completeJson.photo;
  } catch (err) {
    if (err instanceof TypeError && /fetch/i.test(err.message)) {
      throw new Error('Upload interrupted (network or server stopped). Retry the upload.');
    }
    throw new Error(errMessage(err, 'Upload failed'));
  }
}

export async function deletePhotoViaApi(photoId: string, storagePath?: string | null): Promise<void> {
  const res = await fetch('/api/photos/delete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ photoId, storagePath: storagePath ?? null }),
  });
  const json = await readApiJson(res);
  if (!res.ok || !json.ok) {
    throw new Error((json.error && json.error.trim()) || `Delete failed (${res.status})`);
  }
}
