import type { GalleryPhoto } from '@/lib/tour-design-types';

export function photosForProduct(allPhotos: GalleryPhoto[], productCode: string): GalleryPhoto[] {
  return allPhotos.filter((p) => p.product === productCode);
}

export function galleryUrlForProduct(productCode: string): string {
  return `/gallery?product=${encodeURIComponent(productCode)}`;
}

export const TOUR_PREVIEW_PHOTO_SLOTS = 2;

export function productPhotoSlotStatus(photos: GalleryPhoto[], productCode: string) {
  const linked = photosForProduct(photos, productCode).filter((p) => p.url).length;
  return {
    linked,
    needed: TOUR_PREVIEW_PHOTO_SLOTS,
    complete: linked >= TOUR_PREVIEW_PHOTO_SLOTS,
  };
}

export function productPhotoSlotIndex(photos: GalleryPhoto[], photoId: string, productCode: string): number | null {
  if (!productCode) return null;
  const ordered = photosForProduct(photos, productCode);
  const idx = ordered.findIndex((p) => p.id === photoId);
  return idx >= 0 ? idx + 1 : null;
}
