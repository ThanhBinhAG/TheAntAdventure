import {
  CRM_BRANDING_LOGO_FILE_ROUTE,
  CRM_GALLERY_FILE_ROUTE,
  crmGalleryAssetUrl,
  crmGalleryThumbUrl,
  isCrmGalleryAssetUrl,
} from '@/lib/gallery/crm-gallery-asset-url';
import { PHOTOS_BUCKET_PUBLIC_URL_PREFIX } from '@/lib/storage/photo-paths';

export {
  CRM_BRANDING_LOGO_FILE_ROUTE,
  CRM_GALLERY_FILE_ROUTE,
  crmGalleryAssetUrl,
  crmGalleryThumbUrl,
  isCrmGalleryAssetUrl,
};

const GALLERY_VARIANT_PATH = /^gallery\/[A-Za-z0-9_.-]+\/(?:display|thumb)\.webp$/;

/** Legacy Supabase public object URL for the photos bucket. */
export function isLegacyPhotosBucketPublicUrl(url: string): boolean {
  return (
    url.includes(PHOTOS_BUCKET_PUBLIC_URL_PREFIX) ||
    url.includes('.supabase.co/storage/v1/object/public/photos/')
  );
}

export function legacyPublicUrlToStoragePath(url: string): string | null {
  const bare = url.split('?')[0] ?? url;
  const markerIndex = bare.indexOf(PHOTOS_BUCKET_PUBLIC_URL_PREFIX);
  if (markerIndex >= 0) {
    return decodeURIComponent(bare.slice(markerIndex + PHOTOS_BUCKET_PUBLIC_URL_PREFIX.length));
  }
  const match = bare.match(/\/storage\/v1\/object\/public\/photos\/(.+)$/);
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

export function isCrmBrandingLogoFileUrl(url: string): boolean {
  return url.startsWith(`${CRM_BRANDING_LOGO_FILE_ROUTE}?`) || url === CRM_BRANDING_LOGO_FILE_ROUTE;
}

export function crmBrandingLogoFileUrl(version?: string | null): string {
  if (!version) return CRM_BRANDING_LOGO_FILE_ROUTE;
  return `${CRM_BRANDING_LOGO_FILE_ROUTE}?v=${encodeURIComponent(version)}`;
}

export function legacyPublicUrlToCrmGalleryUrl(
  url: string,
  version?: number | string | null,
): string | null {
  const path = legacyPublicUrlToStoragePath(url);
  if (!path || !GALLERY_VARIANT_PATH.test(path)) return null;
  return crmGalleryAssetUrl(path, version);
}

export function mapBrandingLogoUrlForClient(logoUrl: string | null | undefined): string | null {
  if (!logoUrl) return null;
  if (isCrmBrandingLogoFileUrl(logoUrl)) return logoUrl;
  const version = logoUrl.split('?')[1]?.match(/(?:^|&)v=([^&]+)/)?.[1];
  return crmBrandingLogoFileUrl(version ?? null);
}
