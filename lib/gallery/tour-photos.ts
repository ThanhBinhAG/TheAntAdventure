import type { Product } from '@/lib/types';
import type { GalleryPhoto } from '@/lib/tour-design/tour-design-types';
import { photoDisplayUrl, photoThumbUrl, photosForProductSlots } from '@/lib/gallery/gallery-helpers';

export type ResolvedPhoto = { url: string; thumbUrl?: string; caption?: string; photoId?: string };

export function resolveProductPhotos(
  product: Product,
  allPhotos: GalleryPhoto[],
  count = 2
): ResolvedPhoto[] {
  const { slot1, slot2, pool } = photosForProductSlots(allPhotos, product);
  const ordered: GalleryPhoto[] = [slot1, slot2, ...pool].filter((p): p is GalleryPhoto => Boolean(p));
  return ordered.slice(0, count).map((p) => ({
    url: photoDisplayUrl(p)!,
    thumbUrl: photoThumbUrl(p),
    caption: p.caption,
    photoId: p.id,
  }));
}

function dayMatchScore(text: string, keywords: string[]): number {
  const lower = text.toLowerCase();
  return keywords.reduce((score, keyword) => (lower.includes(keyword) ? score + 1 : score), 0);
}

function dayKeywords(dayTitle: string, hotelStr: string): string[] {
  return `${dayTitle} ${hotelStr}`
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 4);
}

/** Package preview: prefer gallery photos in package region. No external fallbacks. */
export function resolvePackageDayPhotos(
  dayTitle: string,
  pkgTag: string,
  hotelStr: string,
  allPhotos: GalleryPhoto[],
  _dayN: number,
  count: number
): ResolvedPhoto[] {
  const keywords = dayKeywords(dayTitle, hotelStr);
  const region = pkgTag === 'full' ? '' : pkgTag;
  const candidates = allPhotos
    .filter((p) => photoDisplayUrl(p) && (!region || p.region === region))
    .map((p) => {
      const haystack = `${p.caption} ${(p.tags || []).join(' ')}`;
      return { p, score: dayMatchScore(haystack, keywords) };
    })
    .sort((a, b) => b.score - a.score);

  const picked: ResolvedPhoto[] = [];
  for (const { p } of candidates) {
    const url = photoDisplayUrl(p)!;
    if (picked.some((r) => r.url === url)) continue;
    picked.push({
      url,
      thumbUrl: photoThumbUrl(p),
      caption: p.caption,
      photoId: p.id,
    });
    if (picked.length >= count) break;
  }

  return picked.slice(0, count);
}
