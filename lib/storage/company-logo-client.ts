/**
 * Browser client for company logo branding API.
 * Dedupes concurrent GETs (React Strict Mode remount), mirrors last-known URL
 * to localStorage for sync first paint, and revalidates once per session.
 */

const STORAGE_KEY = 'taa.companyLogoUrl';

type PersistedLogo = { logoUrl: string | null };

/** In-memory: undefined = unknown; null = no custom logo; string = custom URL. */
let cached: string | null | undefined;
/** True after a successful network GET/POST/DELETE (or set from save/clear). */
let networkConfirmed = false;
let inflight: Promise<string | null> | null = null;

function storageAvailable(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

/** undefined = missing key; null / string = known. */
export function readPersistedCompanyLogoUrl(): string | null | undefined {
  if (!storageAvailable()) return undefined;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw == null) return undefined;
    const parsed = JSON.parse(raw) as PersistedLogo;
    if (!parsed || typeof parsed !== 'object' || !('logoUrl' in parsed)) return undefined;
    if (parsed.logoUrl !== null && typeof parsed.logoUrl !== 'string') return undefined;
    return parsed.logoUrl;
  } catch {
    return undefined;
  }
}

function writePersistedCompanyLogoUrl(logoUrl: string | null): void {
  if (!storageAvailable()) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ logoUrl } satisfies PersistedLogo));
  } catch {
    /* quota / private mode */
  }
}

function clearPersistedCompanyLogoUrl(): void {
  if (!storageAvailable()) return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

function hydrateFromStorage(): void {
  if (cached !== undefined) return;
  const persisted = readPersistedCompanyLogoUrl();
  if (persisted !== undefined) cached = persisted;
}

/**
 * Sync last-known logo for Sidebar first paint.
 * Hydrates from localStorage when memory is cold.
 */
export function getCachedCompanyLogoUrl(): string | null | undefined {
  hydrateFromStorage();
  return cached;
}

/** Update cache after save/delete (or when Sidebar receives onSaved). */
export function setCompanyLogoUrlCache(logoUrl: string | null): void {
  cached = logoUrl;
  networkConfirmed = true;
  inflight = null;
  writePersistedCompanyLogoUrl(logoUrl);
}

/** Drop memory cache so the next fetch hits the network (keeps localStorage). */
export function invalidateCompanyLogoCache(): void {
  cached = undefined;
  networkConfirmed = false;
  inflight = null;
}

/** @internal tests only */
export function resetCompanyLogoClientForTests(): void {
  invalidateCompanyLogoCache();
  clearPersistedCompanyLogoUrl();
}

type LogoGetBody = { ok?: boolean; logoUrl?: string | null; error?: string };

/**
 * GET /api/branding/logo — one in-flight request shared by all callers.
 * After a successful network result (or setCompanyLogoUrlCache), later calls
 * reuse memory without refetch. Hydrated localStorage does not skip revalidate.
 * On network failure, keeps the persisted/memory URL when present.
 */
export function fetchCompanyLogoUrlClient(): Promise<string | null> {
  hydrateFromStorage();
  if (cached !== undefined && networkConfirmed) return Promise.resolve(cached);
  if (inflight) return inflight;

  const previous = cached;

  inflight = (async () => {
    try {
      const res = await fetch('/api/branding/logo', { cache: 'no-store' });
      const body = (await res.json()) as LogoGetBody;
      if (!res.ok || !body.ok) {
        if (previous !== undefined) return previous;
        return null;
      }
      const url = body.logoUrl ?? null;
      cached = url;
      networkConfirmed = true;
      writePersistedCompanyLogoUrl(url);
      return url;
    } catch {
      if (previous !== undefined) return previous;
      return null;
    } finally {
      inflight = null;
    }
  })();

  return inflight;
}

export async function saveCompanyLogoClient(file: File): Promise<string> {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch('/api/branding/logo', { method: 'POST', body: form });
  const body = (await res.json()) as { ok?: boolean; logoUrl?: string; error?: string };
  if (!res.ok || !body.ok || !body.logoUrl) {
    throw new Error(body.error || 'Save failed');
  }
  setCompanyLogoUrlCache(body.logoUrl);
  return body.logoUrl;
}

export async function clearCompanyLogoClient(): Promise<void> {
  const res = await fetch('/api/branding/logo', { method: 'DELETE' });
  const body = (await res.json()) as { ok?: boolean; error?: string };
  if (!res.ok || !body.ok) {
    throw new Error(body.error || 'Reset failed');
  }
  setCompanyLogoUrlCache(null);
}
