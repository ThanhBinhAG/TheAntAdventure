/** Hosts allowed for next/image — keep in sync with next.config.js remotePatterns */

function supabaseUrlHost(): URL | null {
  const raw = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').trim();
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
