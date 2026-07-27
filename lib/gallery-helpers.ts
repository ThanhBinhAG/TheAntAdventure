import type { GalleryPhoto } from '@/lib/tour-design-types';
import { thumbPathFromDisplayPath } from '@/lib/storage/photo-paths';

export function isStoragePhoto(p: GalleryPhoto): boolean {
  if (p.storagePath) return true;
  const url = p.url ?? '';
  return url.includes('.supabase.co/storage/v1/object/public/');
}

export function photoDisplayUrl(p: GalleryPhoto): string | undefined {
  if (isStoragePhoto(p) && p.url) return p.url;
  return p.url || undefined;
}

export function photoThumbUrl(p: GalleryPhoto): string | undefined {
  if (p.thumbUrl) return p.thumbUrl;
  if (p.storagePath) {
    const thumbPath = thumbPathFromDisplayPath(p.storagePath);
    if (thumbPath && p.url) {
      const idx = p.url.indexOf('/storage/v1/object/public/photos/');
      if (idx >= 0) {
        return `${p.url.slice(0, idx)}/storage/v1/object/public/photos/${thumbPath}`;
      }
    }
  }
  if (isStoragePhoto(p) && p.url?.endsWith('/display.webp')) {
    return `${p.url.slice(0, -'display.webp'.length)}thumb.webp`;
  }
  return undefined;
}

export function photosForProduct(allPhotos: GalleryPhoto[], productCode: string): GalleryPhoto[] {
  return allPhotos.filter((p) => p.product === productCode);
}

export type ProductPhotoSlots = {
  slot1: GalleryPhoto | null;
  slot2: GalleryPhoto | null;
  pool: GalleryPhoto[];
};

export function photosForProductSlots(allPhotos: GalleryPhoto[], productCode: string): ProductPhotoSlots {
  const linked = photosForProduct(allPhotos, productCode);
  const withUrl = (p: GalleryPhoto) => Boolean(photoDisplayUrl(p));

  let slot1 = linked.find((p) => p.slot === 1 && withUrl(p)) ?? null;
  let slot2 = linked.find((p) => p.slot === 2 && withUrl(p)) ?? null;

  const pool: GalleryPhoto[] = [];
  for (const p of linked) {
    if (p.slot === 1 || p.slot === 2) continue;
    if (withUrl(p)) pool.push(p);
  }

  // Legacy: photos without explicit slot — assign first two to slots if empty
  if (!slot1 || !slot2) {
    const legacy = linked.filter((p) => !p.slot && withUrl(p));
    if (!slot1 && legacy[0]) slot1 = legacy[0];
    if (!slot2 && legacy[1]) slot2 = legacy[1];
    const used = new Set([slot1?.id, slot2?.id].filter(Boolean));
    for (const p of legacy) {
      if (!used.has(p.id)) pool.push(p);
    }
  }

  return { slot1, slot2, pool };
}

export function galleryUrlForProduct(productCode: string): string {
  return `/gallery?product=${encodeURIComponent(productCode)}`;
}

export function galleryUrlForAttraction(attractionId: string, _name?: string, photoId?: string): string {
  const params = new URLSearchParams({ attraction: attractionId, tab: 'loose' });
  if (photoId) params.set('photo', photoId);
  return `/gallery?${params.toString()}`;
}

export function photosForAttractionByIds<T extends { id: string }>(
  allPhotos: T[],
  photoIds: string[]
): T[] {
  if (!photoIds.length) return [];
  const byId = new Map(allPhotos.map((p) => [p.id, p]));
  return photoIds.map((id) => byId.get(id)).filter((p): p is T => Boolean(p));
}

export const TOUR_PREVIEW_PHOTO_SLOTS = 2;

export function productPhotoSlotStatus(photos: GalleryPhoto[], productCode: string) {
  const { slot1, slot2 } = photosForProductSlots(photos, productCode);
  const linked = (slot1 ? 1 : 0) + (slot2 ? 1 : 0);
  return {
    linked,
    needed: TOUR_PREVIEW_PHOTO_SLOTS,
    complete: Boolean(slot1 && slot2),
  };
}

export function formatBytes(bytes?: number | null): string {
  if (bytes == null || !Number.isFinite(bytes) || bytes < 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(bytes < 10 * 1024 ? 1 : 0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function photoSizeLabel(p: GalleryPhoto): string {
  return formatBytes(p.displayBytes);
}
