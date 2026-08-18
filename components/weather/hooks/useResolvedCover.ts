'use client';

import { useMemo } from 'react';
import { useStore } from '@/hooks/useStore';
import type { GalleryPhoto } from '@/lib/tour-design/tour-design-types';
import { resolveDestinationCover } from '@/lib/weather/resolve-cover';
import type { WeatherDestinationMeta } from '@/lib/weather/types';

/** Cover URLs from gallery store by coverPhotoId; API URLs only before gallery hydrate. */
export function useResolvedCover(meta: WeatherDestinationMeta | null | undefined): {
  coverUrl: string | null;
  coverThumbUrl: string | null;
} {
  const photos = useStore((s) => s.photos) as GalleryPhoto[];
  return useMemo(() => resolveDestinationCover(meta, photos), [meta, photos]);
}
