/**
 * Gallery DTOs are normalized by the server to CRM media routes. Keeping this
 * client boundary as a pass-through prevents legacy Storage URL parsing from
 * entering the browser bundle.
 */
export function toCrmPhotoAssetUrl(src: string): string {
  return src;
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
