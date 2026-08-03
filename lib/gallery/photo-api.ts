import type { GalleryPhoto } from '@/lib/tour-design/tour-design-types';

export type PhotoUploadMeta = {
  photoId: string;
  caption?: string;
  region?: string;
  tags?: string[];
  folderId?: string;
};

async function readApiJson(res: Response): Promise<{ ok?: boolean; error?: string; photo?: GalleryPhoto }> {
  const text = await res.text();
  try {
    return JSON.parse(text) as { ok?: boolean; error?: string; photo?: GalleryPhoto };
  } catch {
    throw new Error(
      res.ok
        ? 'Server returned a non-JSON response'
        : `Upload failed (${res.status}). ${text.slice(0, 120).replace(/\s+/g, ' ')}`
    );
  }
}

export async function uploadPhotoViaApi(file: File, meta: PhotoUploadMeta): Promise<GalleryPhoto> {
  const form = new FormData();
  form.set('file', file);
  form.set('photoId', meta.photoId);
  form.set('caption', meta.caption ?? '');
  form.set('region', meta.region ?? 'north');
  form.set('tags', JSON.stringify(meta.tags ?? []));
  if (meta.folderId) form.set('folderId', meta.folderId);

  const res = await fetch('/api/photos/upload', { method: 'POST', body: form });
  const json = await readApiJson(res);
  if (!res.ok || !json.ok || !json.photo) {
    throw new Error(json.error || `Upload failed (${res.status})`);
  }
  return json.photo;
}

export async function deletePhotoViaApi(photoId: string, storagePath?: string | null): Promise<void> {
  const res = await fetch('/api/photos/delete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ photoId, storagePath: storagePath ?? null }),
  });
  const json = await readApiJson(res);
  if (!res.ok || !json.ok) {
    throw new Error(json.error || `Delete failed (${res.status})`);
  }
}
