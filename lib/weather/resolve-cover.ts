import type { GalleryPhoto } from '@/lib/tour-design/tour-design-types';
import { photoDisplayUrl, photoThumbUrl } from '@/lib/gallery/gallery-helpers';
import { isTableHydrated } from '@/lib/db/sync-lifecycle';
import type { WeatherDestinationMeta } from './types';

export type ResolvedCover = {
  coverUrl: string | null;
  coverThumbUrl: string | null;
};

type CoverMeta = Pick<WeatherDestinationMeta, 'coverPhotoId' | 'coverUrl' | 'coverThumbUrl'>;

/**
 * Resolve weather destination cover URLs.
 * Prefer live gallery store by coverPhotoId (cache-busted); ignore stale denormalized coverUrl.
 */
export function resolveDestinationCover(
  meta: CoverMeta | null | undefined,
  photos: GalleryPhoto[]
): ResolvedCover {
  if (!meta) return { coverUrl: null, coverThumbUrl: null };

  const photoId = meta.coverPhotoId?.trim() || null;

  if (photoId) {
    const photo = photos.find((p) => p.id === photoId);
    if (photo) {
      const coverUrl = photoDisplayUrl(photo) || null;
      return {
        coverUrl,
        coverThumbUrl: photoThumbUrl(photo) || coverUrl,
      };
    }

    if (isTableHydrated('photos')) {
      return { coverUrl: null, coverThumbUrl: null };
    }

    if (meta.coverUrl || meta.coverThumbUrl) {
      return {
        coverUrl: meta.coverUrl,
        coverThumbUrl: meta.coverThumbUrl || meta.coverUrl,
      };
    }

    return { coverUrl: null, coverThumbUrl: null };
  }

  if (meta.coverUrl || meta.coverThumbUrl) {
    return {
      coverUrl: meta.coverUrl,
      coverThumbUrl: meta.coverThumbUrl || meta.coverUrl,
    };
  }

  return { coverUrl: null, coverThumbUrl: null };
}

/** Card / grid backgrounds — thumb only (never full display.webp). */
export function weatherCardCoverUrl(resolved: ResolvedCover): string | null {
  return resolved.coverThumbUrl;
}

/** Detail hero — prefer thumb; full display only when no thumb exists. */
export function weatherHeroCoverUrl(resolved: ResolvedCover): string | null {
  return resolved.coverThumbUrl || resolved.coverUrl;
}
