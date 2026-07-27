export const PHOTOS_BUCKET = 'photos';

export type GalleryPhotoOwner =
  | { kind: 'tour'; tourCode: string }
  | { kind: 'attraction'; attractionId: string }
  | { kind: 'loose' };

function sanitizePathSegment(value: string): string {
  return value.trim().replace(/[^\w.-]+/g, '-');
}

export function galleryOwnerBasePath(owner: GalleryPhotoOwner, photoId: string): string {
  if (owner.kind === 'tour') {
    return `gallery/tours/${sanitizePathSegment(owner.tourCode)}/${photoId}`;
  }
  if (owner.kind === 'attraction') {
    return `gallery/attractions/${sanitizePathSegment(owner.attractionId)}/${photoId}`;
  }
  return `gallery/loose/${photoId}`;
}

export function legacyGalleryDisplayPath(photoId: string): string {
  return `gallery/${photoId}/display.webp`;
}

export function legacyGalleryThumbPath(photoId: string): string {
  return `gallery/${photoId}/thumb.webp`;
}

export function galleryDisplayPath(photoId: string, owner?: GalleryPhotoOwner): string {
  return `${galleryOwnerBasePath(owner ?? { kind: 'loose' }, photoId)}/display.webp`;
}

export function galleryThumbPath(photoId: string, owner?: GalleryPhotoOwner): string {
  return `${galleryOwnerBasePath(owner ?? { kind: 'loose' }, photoId)}/thumb.webp`;
}

export function galleryStoragePaths(photoId: string, owner?: GalleryPhotoOwner): string[] {
  return [galleryDisplayPath(photoId, owner), galleryThumbPath(photoId, owner)];
}

export function galleryDeleteCandidatePaths(photoId: string, owner?: GalleryPhotoOwner): string[] {
  const out = new Set<string>();
  for (const path of galleryStoragePaths(photoId, owner)) out.add(path);
  out.add(legacyGalleryDisplayPath(photoId));
  out.add(legacyGalleryThumbPath(photoId));
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
