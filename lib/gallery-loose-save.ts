import { useStore } from '@/hooks/useStore';
import { pushTablesToSupabase } from '@/lib/db/hydrate';
import type { GalleryPhotoSavePayload, LoosePhotoBatchItem } from '@/components/gallery/GalleryPhotoModal';
import type { GalleryPhoto } from '@/lib/tour-design-types';
import { linkPhotoToAttractionWithFeatured } from '@/lib/attractions-helpers';
import { createClient } from '@/lib/supabase/client';
import { uploadGalleryPhoto } from '@/lib/storage/upload-gallery-photo';
import type { GalleryPhotoOwner } from '@/lib/storage/photo-paths';

export function nextGalleryPhotoId(photos: GalleryPhoto[]): string {
  const max = photos.reduce((n, p) => {
    const num = parseInt(p.id.replace(/^PH-/, ''), 10);
    return Number.isFinite(num) ? Math.max(n, num) : n;
  }, 0);
  return `PH-${String(max + 1).padStart(3, '0')}`;
}

export type SaveLoosePhotoResult = {
  photoId: string;
  record: GalleryPhoto;
};

export type SaveLoosePhotosBatchResult = {
  photoIds: string[];
  records: GalleryPhoto[];
};

async function uploadLooseRecord(
  photoId: string,
  file: File,
  meta: { caption: string; region: string; tags: string[]; attractionId?: string }
): Promise<GalleryPhoto> {
  const supabase = createClient();
  const owner: GalleryPhotoOwner = meta.attractionId
    ? { kind: 'attraction', attractionId: meta.attractionId }
    : { kind: 'loose' };
  const uploaded = await uploadGalleryPhoto(supabase, photoId, file, owner);
  return {
    id: photoId,
    caption: meta.caption.trim(),
    region: meta.region,
    tags: meta.tags,
    url: uploaded.url,
    thumbUrl: uploaded.thumbUrl,
    storagePath: uploaded.storagePath,
    displayBytes: uploaded.displayBytes,
  };
}

/** Upload multiple loose photos, update store, optionally link each to an attraction pool. */
export async function saveNewLoosePhotosBatch(
  items: LoosePhotoBatchItem[],
  data: Pick<GalleryPhotoSavePayload, 'region' | 'tags'>,
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
  let photos = useStore.getState().photos as GalleryPhoto[];
  const records: GalleryPhoto[] = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i]!;
    opts?.onStatus?.(`Compressing and uploading photo ${i + 1} of ${items.length}…`);
    const photoId = nextGalleryPhotoId(photos);
    const record = await uploadLooseRecord(photoId, item.file, {
      caption: item.caption,
      region,
      tags,
      attractionId: opts?.attractionId,
    });
    photos = [...photos, record];
    useStore.setState({ photos });
    records.push(record);

    if (opts?.attractionId) {
      linkPhotoToAttractionWithFeatured(opts.attractionId, photoId);
    }
  }

  opts?.onStatus?.('Saving metadata to Supabase…');
  const photosResult = await pushTablesToSupabase(['photos'], false);
  if (!photosResult.ok) {
    throw new Error(photosResult.error ?? 'Không lưu được metadata ảnh lên Supabase');
  }

  if (opts?.attractionId) {
    const attractionsResult = await pushTablesToSupabase(['attractions'], false);
    if (!attractionsResult.ok) {
      throw new Error(attractionsResult.error ?? 'Không lưu được liên kết attraction lên Supabase');
    }
  }

  return { photoIds: records.map((r) => r.id), records };
}

/** Upload a new loose photo, update store, optionally link to an attraction pool. */
export async function saveNewLoosePhoto(
  data: GalleryPhotoSavePayload,
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

  opts?.onStatus?.('Compressing and uploading…');
  const record = await uploadLooseRecord(photoId, data.file, {
    caption: data.caption,
    region: data.region || opts?.defaultRegion || 'north',
    tags: data.tags ?? [],
    attractionId: opts?.attractionId,
  });

  useStore.setState({ photos: [...photos, record] });

  if (opts?.attractionId) {
    linkPhotoToAttractionWithFeatured(opts.attractionId, photoId);
  }

  opts?.onStatus?.('Saving metadata to Supabase…');
  const photosResult = await pushTablesToSupabase(['photos'], false);
  if (!photosResult.ok) {
    throw new Error(photosResult.error ?? 'Không lưu được metadata ảnh lên Supabase');
  }

  if (opts?.attractionId) {
    const attractionsResult = await pushTablesToSupabase(['attractions'], false);
    if (!attractionsResult.ok) {
      throw new Error(attractionsResult.error ?? 'Không lưu được liên kết attraction lên Supabase');
    }
  }

  return { photoId, record };
}
