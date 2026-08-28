import {
  CRM_BRANDING_LOGO_FILE_ROUTE,
  CRM_GALLERY_FILE_ROUTE,
  isLegacyPhotosBucketPublicUrl,
  legacyPublicUrlToCrmGalleryUrl,
} from '@/lib/gallery/gallery-asset-url';
import { PHOTOS_BUCKET_PUBLIC_URL_PREFIX } from '@/lib/storage/photo-paths';

/** Hosts allowed for next/image — keep in sync with next.config.js remotePatterns */
const GALLERY_VARIANT_PATH = /^gallery\/[A-Za-z0-9_.-]+\/(?:display|thumb)\.webp$/;

/**
 * Keeps browser media requests on the CRM origin. The server independently
 * allow-lists this path before downloading from the `photos` Storage bucket.
 */
export function toCrmPhotoAssetUrl(src: string): string {
  if (
    src.startsWith(`${CRM_GALLERY_FILE_ROUTE}?`) ||
    src === CRM_GALLERY_FILE_ROUTE ||
    src.startsWith(`${CRM_BRANDING_LOGO_FILE_ROUTE}?`) ||
    src === CRM_BRANDING_LOGO_FILE_ROUTE
  ) {
    return src;
  }

  if (isLegacyPhotosBucketPublicUrl(src)) {
    try {
      const source = new URL(src);
      const crm = legacyPublicUrlToCrmGalleryUrl(src, source.searchParams.get('v'));
      if (crm) return crm;
    } catch {
      const crm = legacyPublicUrlToCrmGalleryUrl(src);
      if (crm) return crm;
    }
  }

  try {
    const source = new URL(src);
    const markerIndex = source.pathname.indexOf(PHOTOS_BUCKET_PUBLIC_URL_PREFIX);
    if (markerIndex < 0) return src;

    const path = decodeURIComponent(source.pathname.slice(markerIndex + PHOTOS_BUCKET_PUBLIC_URL_PREFIX.length));
    if (!GALLERY_VARIANT_PATH.test(path)) return src;

    const query = new URLSearchParams({ path });
    const version = source.searchParams.get('v');
    if (version) query.set('v', version);
    return `${CRM_GALLERY_FILE_ROUTE}?${query.toString()}`;
  } catch {
    return src;
  }
}

export function isNextImageOptimizable(src: string): boolean {
  if (!src || src.startsWith('blob:') || src.startsWith('data:')) return false;
  if (src.startsWith('/api/')) return false;

  try {
    const u = new URL(src);
    if (u.hostname === 'picsum.photos') return true;
    return false;
  } catch {
    return false;
  }
}
