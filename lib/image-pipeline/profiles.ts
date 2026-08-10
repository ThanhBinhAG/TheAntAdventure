/**
 * Size profiles for server-side gallery Sharp processing.
 * Variant names map onto `photos` columns: display → `url`, thumb → `thumb_url`.
 */
import {
  GALLERY_DISPLAY_MAX_EDGE,
  GALLERY_THUMB_MAX_EDGE,
} from '@/lib/image-pipeline/limits';

export type GalleryVariantName = 'display' | 'thumb';

export type GalleryVariantSpec = {
  name: GalleryVariantName;
  /** Longest-edge ceiling; `null` keeps the source dimensions. */
  maxEdge: number | null;
  quality: number;
  /** Soft output ceiling — one lower-quality recompress pass runs if exceeded. */
  maxBytes: number | null;
};

export type GallerySizeProfileName = 'small' | 'standard' | 'large';

export type GallerySizeProfile = {
  name: GallerySizeProfileName;
  variants: GalleryVariantSpec[];
};

const SMALL_MAX_BYTES = 2 * 1024 * 1024;
const STANDARD_MAX_BYTES = 32 * 1024 * 1024;

export const GALLERY_SIZE_PROFILES: Record<GallerySizeProfileName, GallerySizeProfile> = {
  small: {
    name: 'small',
    variants: [
      { name: 'display', maxEdge: GALLERY_DISPLAY_MAX_EDGE, quality: 84, maxBytes: null },
      { name: 'thumb', maxEdge: GALLERY_THUMB_MAX_EDGE, quality: 75, maxBytes: 80_000 },
    ],
  },
  standard: {
    name: 'standard',
    variants: [
      { name: 'display', maxEdge: GALLERY_DISPLAY_MAX_EDGE, quality: 82, maxBytes: null },
      { name: 'thumb', maxEdge: GALLERY_THUMB_MAX_EDGE, quality: 75, maxBytes: 80_000 },
    ],
  },
  large: {
    name: 'large',
    variants: [
      { name: 'display', maxEdge: GALLERY_DISPLAY_MAX_EDGE, quality: 78, maxBytes: null },
      { name: 'thumb', maxEdge: GALLERY_THUMB_MAX_EDGE, quality: 72, maxBytes: 70_000 },
    ],
  },
};

export function pickGalleryProfile(sourceBytes: number): GallerySizeProfile {
  if (sourceBytes <= SMALL_MAX_BYTES) return GALLERY_SIZE_PROFILES.small;
  if (sourceBytes <= STANDARD_MAX_BYTES) return GALLERY_SIZE_PROFILES.standard;
  return GALLERY_SIZE_PROFILES.large;
}

/** Variants ordered largest-first so the worker chains decodes once. */
export function galleryVariantChain(profile: GallerySizeProfile): GalleryVariantSpec[] {
  return [...profile.variants].sort((a, b) => (b.maxEdge ?? Infinity) - (a.maxEdge ?? Infinity));
}
