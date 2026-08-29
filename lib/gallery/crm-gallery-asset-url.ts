/** Client-safe CRM media routes. Legacy Storage URL parsing stays server-only. */
export const CRM_GALLERY_FILE_ROUTE = '/api/photos/file';
export const CRM_BRANDING_LOGO_FILE_ROUTE = '/api/branding/logo/file';

export function isCrmGalleryAssetUrl(url: string): boolean {
  return url.startsWith(`${CRM_GALLERY_FILE_ROUTE}?`) || url === CRM_GALLERY_FILE_ROUTE;
}

export function crmGalleryAssetUrl(storagePath: string, version?: number | string | null): string {
  const query = new URLSearchParams({ path: storagePath });
  if (version != null && version !== '') query.set('v', String(version));
  return `${CRM_GALLERY_FILE_ROUTE}?${query.toString()}`;
}

export function crmGalleryThumbUrl(
  storagePath: string,
  version?: number | string | null,
): string | undefined {
  if (!storagePath.endsWith('/display.webp')) return undefined;
  return crmGalleryAssetUrl(`${storagePath.slice(0, -'display.webp'.length)}thumb.webp`, version);
}
