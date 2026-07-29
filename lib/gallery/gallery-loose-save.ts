import { useStore } from '@/hooks/useStore';
import { pushTablesToSupabase } from '@/lib/db/hydrate';
import type { GalleryPhoto } from '@/lib/tour-design/tour-design-types';
import { linkPhotoToAttractionWithFeatured } from '@/lib/attractions/attractions-helpers';
import { nextPhotoId } from '@/lib/gallery/gallery-helpers';
import { uploadPhotoViaApi } from '@/lib/gallery/photo-api';

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

/** Upload multiple library photos via Sharp API; optionally link to an attraction. */
export async function saveNewLoosePhotosBatch(
  items: LoosePhotoBatchItem[],
  data: { region: string; tags: string[] },
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
    opts?.onStatus?.(`Uploading photo ${i + 1} of ${items.length}…`);
    const photoId = nextGalleryPhotoId(photos);
    const record = await uploadPhotoViaApi(item.file, {
      photoId,
      caption: item.caption.trim(),
      region,
      tags,
    });
    photos = [...photos, record];
    useStore.setState({ photos });
    records.push(record);

    if (opts?.attractionId) {
      linkPhotoToAttractionWithFeatured(opts.attractionId, photoId);
    }
  }

  if (opts?.attractionId) {
    opts?.onStatus?.('Saving attraction links…');
    const attractionsResult = await pushTablesToSupabase(['attractions'], false);
    if (!attractionsResult.ok) {
      throw new Error(attractionsResult.error ?? 'Không lưu được liên kết attraction lên Supabase');
    }
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
  });

  useStore.setState({ photos: [...photos, record] });

  if (opts?.attractionId) {
    linkPhotoToAttractionWithFeatured(opts.attractionId, photoId);
    opts?.onStatus?.('Saving attraction links…');
    const attractionsResult = await pushTablesToSupabase(['attractions'], false);
    if (!attractionsResult.ok) {
      throw new Error(attractionsResult.error ?? 'Không lưu được liên kết attraction lên Supabase');
    }
  }

  return { photoId, record };
}
