import type { GalleryPhoto } from '@/lib/tour-design/tour-design-types';
import type { Product } from '@/lib/types';
import { thumbPathFromDisplayPath } from '@/lib/storage/photo-paths';

export function isStoragePhoto(p: GalleryPhoto): boolean {
  if (p.storagePath) return true;
  const url = p.url ?? '';
  return url.includes('.supabase.co/storage/v1/object/public/') || url.includes('/storage/v1/object/public/photos/');
}

/**
 * Bust browser / next/image cache when Storage path is reused (upsert replace).
 * Prefer `displayBytes` — it changes whenever Sharp rewrites the file.
 */
export function withPhotoCacheBust(url: string, version?: number | string | null): string {
  if (!url || version == null || version === '') return url;
  const v = String(version);
  try {
    const u = new URL(url);
    u.searchParams.set('v', v);
    return u.href;
  } catch {
    const bare = url.split('#')[0]?.split('?')[0] ?? url;
    return `${bare}?v=${encodeURIComponent(v)}`;
  }
}

function cacheBustPhotoUrl(url: string | undefined, p: GalleryPhoto): string | undefined {
  if (!url) return undefined;
  return withPhotoCacheBust(url, p.displayBytes ?? null);
}

export function photoDisplayUrl(p: GalleryPhoto): string | undefined {
  const raw = p.url || undefined;
  if (!raw) return undefined;
  if (isStoragePhoto(p)) return cacheBustPhotoUrl(raw, p);
  return raw;
}

export function photoThumbUrl(p: GalleryPhoto): string | undefined {
  let raw: string | undefined;
  if (p.thumbUrl) {
    raw = p.thumbUrl;
  } else if (p.storagePath) {
    const thumbPath = thumbPathFromDisplayPath(p.storagePath);
    if (thumbPath && p.url) {
      const base = p.url.split('?')[0] ?? p.url;
      const idx = base.indexOf('/storage/v1/object/public/photos/');
      if (idx >= 0) {
        raw = `${base.slice(0, idx)}/storage/v1/object/public/photos/${thumbPath}`;
      }
    }
  } else if (isStoragePhoto(p) && p.url) {
    const base = p.url.split('?')[0] ?? p.url;
    if (base.endsWith('/display.webp')) {
      raw = `${base.slice(0, -'display.webp'.length)}thumb.webp`;
    }
  }
  return cacheBustPhotoUrl(raw, p);
}

export type ProductPhotoSlots = {
  slot1: GalleryPhoto | null;
  slot2: GalleryPhoto | null;
  pool: GalleryPhoto[];
};

/** Featured (photoIds) map to preview slots; remaining linked = pool. */
export function photosForProductSlots(
  allPhotos: GalleryPhoto[],
  product: Pick<Product, 'photoIds' | 'linkedPhotoIds'>
): ProductPhotoSlots {
  const byId = new Map(allPhotos.map((p) => [p.id, p]));
  const withUrl = (p: GalleryPhoto | undefined): p is GalleryPhoto => Boolean(p && photoDisplayUrl(p));

  const featured = (product.photoIds ?? [])
    .map((id) => byId.get(id))
    .filter(withUrl)
    .slice(0, 2);
  const slot1 = featured[0] ?? null;
  const slot2 = featured[1] ?? null;

  const featuredSet = new Set(featured.map((p) => p.id));
  const linked =
    product.linkedPhotoIds?.length
      ? product.linkedPhotoIds
      : (product.photoIds ?? []);
  const pool: GalleryPhoto[] = [];
  for (const id of linked) {
    if (featuredSet.has(id)) continue;
    const p = byId.get(id);
    if (withUrl(p)) pool.push(p);
  }

  return { slot1, slot2, pool };
}

export const TOUR_PREVIEW_PHOTO_SLOTS = 2;

export function productPhotoSlotStatus(product: Pick<Product, 'photoIds' | 'linkedPhotoIds'>) {
  const featured = (product.photoIds ?? []).slice(0, TOUR_PREVIEW_PHOTO_SLOTS);
  const linked = featured.length;
  return {
    linked,
    needed: TOUR_PREVIEW_PHOTO_SLOTS,
    complete: linked >= TOUR_PREVIEW_PHOTO_SLOTS,
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

export function nextPhotoId(photos: { id: string }[]): string {
  const max = photos.reduce((n, p) => {
    const num = parseInt(p.id.replace(/^PH-/, ''), 10);
    return Number.isFinite(num) ? Math.max(n, num) : n;
  }, 0);
  return `PH-${String(max + 1).padStart(3, '0')}`;
}
