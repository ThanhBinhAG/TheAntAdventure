export const PHOTOS_BUCKET = 'photos';

/** @deprecated Legacy public-object URL prefix — used only to rewrite old stored URLs. */
export const PHOTOS_BUCKET_PUBLIC_URL_PREFIX = `/storage/v1/object/public/${PHOTOS_BUCKET}/`;

/** Whether a URL targets the CRM photos bucket (local Supabase or hosted). */
export function isPhotosBucketPublicUrl(url: string): boolean {
  return (
    url.includes(PHOTOS_BUCKET_PUBLIC_URL_PREFIX) ||
    url.includes(`.supabase.co/storage/v1/object/public/${PHOTOS_BUCKET}/`)
  );
}

/** Rewrite a base public display URL to another object path in the same bucket. */
export function photosBucketPublicUrlFromBase(baseUrl: string, objectPath: string): string | undefined {
  const base = baseUrl.split('?')[0] ?? baseUrl;
  const idx = base.indexOf(PHOTOS_BUCKET_PUBLIC_URL_PREFIX);
  if (idx < 0) return undefined;
  return `${base.slice(0, idx)}${PHOTOS_BUCKET_PUBLIC_URL_PREFIX}${objectPath}`;
}

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

/** Legacy fixed path (pre-versioned uploads). */
export const LEGACY_COMPANY_LOGO_PATH = 'branding/logo.webp';

/** Versioned CRM company logo path: `branding/logo-{version}.webp`. */
export function companyLogoPath(version: string): string {
  return `branding/logo-${sanitizePathSegment(version)}.webp`;
}

/** Extract Storage object path from a public logo URL (strips query string). */
export function companyLogoObjectPathFromUrl(logoUrl: string | null | undefined): string | null {
  if (!logoUrl) return null;
  const bare = logoUrl.split('?')[0] ?? '';
  const marker = `/${PHOTOS_BUCKET}/`;
  const idx = bare.indexOf(marker);
  if (idx >= 0) {
    const path = bare.slice(idx + marker.length);
    return path.startsWith('branding/') ? path : null;
  }
  const match = bare.match(/branding\/logo[^/]*\.webp$/i);
  return match?.[0] ?? null;
}
