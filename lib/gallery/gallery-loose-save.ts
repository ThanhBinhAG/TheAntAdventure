import { useStore } from '@/hooks/useStore';
import type { GalleryPhoto } from '@/lib/tour-design/tour-design-types';
import type { Attraction } from '@/lib/types';
import { nextPhotoId } from '@/lib/gallery/gallery-helpers';
import { uploadPhotoViaApi } from '@/lib/gallery/photo-api';
import { UNSORTED_FOLDER_ID } from '@/lib/gallery/photo-folders';

export function nextGalleryPhotoId(photos: GalleryPhoto[]): string {
  return nextPhotoId(photos);
}

export type LoosePhotoBatchItem = {
  file: File;
  caption: string;
};

export type SaveLoosePhotoResult = {
  photoId: string;
  record: GalleryPhoto;
};

export type SaveLoosePhotosBatchResult = {
  photoIds: string[];
  records: GalleryPhoto[];
};

async function linkPhotoToAttractionViaApi(attractionId: string, photoId: string): Promise<void> {
  const attraction = useStore.getState().attractions.find((item) => item.id === attractionId);
  if (!attraction) throw new Error('Không tìm thấy địa điểm để liên kết ảnh.');

  const linked = attraction.linkedPhotoIds?.length ? attraction.linkedPhotoIds : (attraction.photoIds ?? []);
  const next: Attraction = {
    ...attraction,
    linkedPhotoIds: linked.includes(photoId) ? linked : [...linked, photoId],
    photoIds:
      attraction.photoIds?.length && attraction.photoIds.length >= 4
        ? attraction.photoIds
        : [...(attraction.photoIds ?? []), photoId].filter((id, index, ids) => ids.indexOf(id) === index),
  };
  const response = await fetch('/api/attractions', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ attraction: next }),
  });
  const result = await response.json().catch(() => null) as { ok?: boolean; error?: string } | null;
  if (!response.ok || !result?.ok) {
    throw new Error(result?.error ?? 'Không thể lưu liên kết ảnh địa điểm.');
  }

  useStore.getState().updateAttraction(attractionId, next);
}

/** Upload multiple library photos via chunked API (server Sharp); optionally link to an attraction. */
export async function saveNewLoosePhotosBatch(
  items: LoosePhotoBatchItem[],
  data: { region: string; tags: string[]; folderId?: string },
  opts?: {
    attractionId?: string;
    defaultRegion?: string;
    onStatus?: (status: string) => void;
  }
): Promise<SaveLoosePhotosBatchResult> {
  if (!items.length) throw new Error('Add at least one image.');
  if (!items.every((item) => item.caption.trim())) throw new Error('Caption is required for every photo.');

  const region = data.region || opts?.defaultRegion || 'north';
  const tags = data.tags ?? [];
  const folderId = data.folderId || UNSORTED_FOLDER_ID;
  let photos = useStore.getState().photos as GalleryPhoto[];
  const records: GalleryPhoto[] = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i]!;
    opts?.onStatus?.(`Uploading photo ${i + 1} of ${items.length}…`);
    const photoId = nextGalleryPhotoId(photos);
    const record = await uploadPhotoViaApi(item.file, {
      photoId,
      caption: item.caption.trim(),
      region,
      tags,
      folderId,
    });
    photos = [...photos, record];
    useStore.setState({ photos });
    records.push(record);

  }

  if (opts?.attractionId) {
    opts?.onStatus?.('Saving attraction links…');
    for (const photo of records) await linkPhotoToAttractionViaApi(opts.attractionId, photo.id);
  }

  return { photoIds: records.map((r) => r.id), records };
}

export async function saveNewLoosePhoto(
  data: {
    caption: string;
    region: string;
    tags: string[];
    file?: File | null;
    looseBatch?: LoosePhotoBatchItem[];
    folderId?: string;
  },
  opts?: {
    attractionId?: string;
    defaultRegion?: string;
    onStatus?: (status: string) => void;
  }
): Promise<SaveLoosePhotoResult> {
  if (data.looseBatch?.length) {
    const batch = await saveNewLoosePhotosBatch(data.looseBatch, data, opts);
    const first = batch.records[0];
    if (!first) throw new Error('Upload failed.');
    return { photoId: first.id, record: first };
  }

  if (!data.file) throw new Error('Image file is required.');
  if (!data.caption.trim()) throw new Error('Caption is required.');

  const photos = useStore.getState().photos as GalleryPhoto[];
  const photoId = nextGalleryPhotoId(photos);

  opts?.onStatus?.('Uploading…');
  const record = await uploadPhotoViaApi(data.file, {
    photoId,
    caption: data.caption.trim(),
    region: data.region || opts?.defaultRegion || 'north',
    tags: data.tags ?? [],
    folderId: data.folderId || UNSORTED_FOLDER_ID,
  });

  useStore.setState({ photos: [...photos, record] });

  if (opts?.attractionId) {
    opts?.onStatus?.('Saving attraction links…');
    await linkPhotoToAttractionViaApi(opts.attractionId, photoId);
  }

  return { photoId, record };
}
