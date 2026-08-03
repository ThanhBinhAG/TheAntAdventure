export const PHOTOS_BUCKET = 'photos';

function sanitizePathSegment(value: string): string {
  return value.trim().replace(/[^\w.-]+/g, '-');
}

/** Flat library path: gallery/{photoId}/ */
export function galleryOwnerBasePath(photoId: string): string {
  return `gallery/${sanitizePathSegment(photoId)}`;
}

export function galleryDisplayPath(photoId: string): string {
  return `${galleryOwnerBasePath(photoId)}/display.webp`;
}

export function galleryThumbPath(photoId: string): string {
  return `${galleryOwnerBasePath(photoId)}/thumb.webp`;
}

export function galleryStoragePaths(photoId: string): string[] {
  return [galleryDisplayPath(photoId), galleryThumbPath(photoId)];
}

/** Prefer stored storage_path; also try flat paths for cleanup. */
export function galleryDeleteCandidatePaths(photoId: string, storagePath?: string | null): string[] {
  const out = new Set<string>();
  for (const path of galleryStoragePaths(photoId)) out.add(path);
  if (storagePath) {
    out.add(storagePath);
    if (storagePath.endsWith('/display.webp')) {
      out.add(`${storagePath.slice(0, -'display.webp'.length)}thumb.webp`);
    }
  }
  return [...out];
}

export function thumbPathFromDisplayPath(displayPath?: string | null): string | undefined {
  if (!displayPath) return undefined;
  if (!displayPath.endsWith('/display.webp')) return undefined;
  return `${displayPath.slice(0, -'display.webp'.length)}thumb.webp`;
}

export function guideAvatarPath(guideId: string): string {
  return `guides/${guideId}/avatar.webp`;
}
