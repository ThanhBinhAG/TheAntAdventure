'use client';

import { useMemo } from 'react';
import { useStore } from '@/hooks/useStore';
import type { GalleryPhoto } from '@/lib/tour-design/tour-design-types';
import { photoDisplayUrl, photoThumbUrl } from '@/lib/gallery/gallery-helpers';
import type { WeatherDestinationMeta } from '@/lib/weather/types';

/** Prefer API cover URLs; fall back to hydrated gallery store by coverPhotoId. */
export function useResolvedCover(meta: WeatherDestinationMeta | null | undefined): {
  coverUrl: string | null;
  coverThumbUrl: string | null;
} {
  const photos = useStore((s) => s.photos) as GalleryPhoto[];
  return useMemo(() => {
    if (!meta) return { coverUrl: null, coverThumbUrl: null };
    if (meta.coverUrl || meta.coverThumbUrl) {
      return {
        coverUrl: meta.coverUrl,
        coverThumbUrl: meta.coverThumbUrl || meta.coverUrl,
      };
    }
    if (!meta.coverPhotoId) return { coverUrl: null, coverThumbUrl: null };
    const photo = photos.find((p) => p.id === meta.coverPhotoId);
    if (!photo) return { coverUrl: null, coverThumbUrl: null };
    return {
      coverUrl: photoDisplayUrl(photo) || null,
      coverThumbUrl: photoThumbUrl(photo) || photoDisplayUrl(photo) || null,
    };
  }, [meta, photos]);
}
