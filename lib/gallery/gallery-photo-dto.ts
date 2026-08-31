import type { GalleryPhoto } from '@/lib/tour-design/tour-design-types';
import {
  crmGalleryAssetUrl,
  crmGalleryThumbUrl,
  isCrmGalleryAssetUrl,
  isLegacyPhotosBucketPublicUrl,
  legacyPublicUrlToCrmGalleryUrl,
  legacyPublicUrlToStoragePath,
} from '@/lib/gallery/gallery-asset-url';
import { thumbPathFromDisplayPath } from '@/lib/storage/photo-paths';

type GalleryPhotoRowLike = {
  id: string;
  caption?: string | null;
  region?: string | null;
  url?: string | null;
  thumb_url?: string | null;
  storage_path?: string | null;
  display_bytes?: number | null;
  folder_id?: string | null;
  tags?: string[];
};

function resolveDisplayUrl(row: GalleryPhotoRowLike): string | null {
  const version = row.display_bytes ?? null;
  if (row.storage_path) {
    return crmGalleryAssetUrl(row.storage_path, version);
  }
  const url = row.url ?? '';
  if (!url) return null;
  if (isCrmGalleryAssetUrl(url)) return url;
  if (isLegacyPhotosBucketPublicUrl(url)) {
    return legacyPublicUrlToCrmGalleryUrl(url, version) ?? url;
  }
  return url;
}

function resolveThumbUrl(row: GalleryPhotoRowLike, displayUrl: string | null): string | null {
  const version = row.display_bytes ?? null;
  if (row.storage_path) {
    return crmGalleryThumbUrl(row.storage_path, version) ?? displayUrl;
  }
  const thumbUrl = row.thumb_url ?? '';
  if (thumbUrl) {
    if (isCrmGalleryAssetUrl(thumbUrl)) return thumbUrl;
    if (isLegacyPhotosBucketPublicUrl(thumbUrl)) {
      return legacyPublicUrlToCrmGalleryUrl(thumbUrl, version) ?? thumbUrl;
    }
    return thumbUrl;
  }
  const url = row.url ?? '';
  if (isLegacyPhotosBucketPublicUrl(url)) {
    const path = legacyPublicUrlToStoragePath(url);
    const thumbPath = path ? thumbPathFromDisplayPath(path) : undefined;
    if (thumbPath) return crmGalleryAssetUrl(thumbPath, version);
  }
  return displayUrl;
}

/** Map a DB/API photo row to client-safe CRM asset URLs. */
export function mapGalleryPhotoForClient(row: GalleryPhotoRowLike): GalleryPhoto {
  const displayUrl = resolveDisplayUrl(row);
  const thumbUrl = resolveThumbUrl(row, displayUrl);
  return {
    id: row.id,
    caption: row.caption ?? '',
    region: (row.region ?? 'north') as GalleryPhoto['region'],
    url: displayUrl ?? '',
    thumbUrl: thumbUrl ?? undefined,
    storagePath: row.storage_path ?? undefined,
    displayBytes: row.display_bytes ?? undefined,
    folderId: row.folder_id ?? undefined,
    tags: row.tags ?? [],
  };
}

/** Alias for gallery-shaped photo rows — single server mapper for CRM asset URLs. */
export const mapPhotoUrlForClient = mapGalleryPhotoForClient;
