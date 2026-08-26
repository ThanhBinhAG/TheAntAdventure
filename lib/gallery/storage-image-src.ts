import { getSupabaseUrl } from '@/lib/env';

/** Hosts allowed for next/image — keep in sync with next.config.js remotePatterns */

const GALLERY_PUBLIC_PATH = '/storage/v1/object/public/photos/';
const GALLERY_VARIANT_PATH = /^gallery\/[A-Za-z0-9_.-]+\/(?:display|thumb)\.webp$/;

/**
 * Keeps browser media requests on the CRM origin. The server independently
 * allow-lists this path before downloading from the `photos` Storage bucket.
 */
export function toCrmPhotoAssetUrl(src: string): string {
  try {
    const source = new URL(src);
    const markerIndex = source.pathname.indexOf(GALLERY_PUBLIC_PATH);
    if (markerIndex < 0) return src;

    const path = decodeURIComponent(source.pathname.slice(markerIndex + GALLERY_PUBLIC_PATH.length));
    if (!GALLERY_VARIANT_PATH.test(path)) return src;

    const query = new URLSearchParams({ path });
    const version = source.searchParams.get('v');
    if (version) query.set('v', version);
    return `/api/photos/file?${query.toString()}`;
  } catch {
    return src;
  }
}

function supabaseUrlHost(): URL | null {
  const raw = getSupabaseUrl();
  if (!raw) return null;
  try {
    return new URL(raw);
  } catch {
    return null;
  }
}

export function isNextImageOptimizable(src: string): boolean {
  if (!src || src.startsWith('blob:') || src.startsWith('data:')) return false;
  try {
    const u = new URL(src);
    if (u.hostname === 'picsum.photos') return true;
    if (u.hostname.endsWith('.supabase.co')) return true;

    const base = supabaseUrlHost();
    if (base && u.hostname === base.hostname && u.port === base.port) return true;

    return false;
  } catch {
    return false;
  }
}
