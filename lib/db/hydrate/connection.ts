import { isRemoteDataEnabled } from '../../env';
import { db as supabaseDb } from '../supabase';
import { withTimeout } from '../timeout';

const PING_TIMEOUT_MS = 8_000;
/** Reuse any ping (ok or failed) briefly so Strict Mode remount / double-mount does not hit the network twice. */
const PING_CACHE_MS = 15_000;
/** Successful pings survive F5 so the Topbar dot renders without a `customers` round-trip on every reload. */
const PING_SESSION_KEY = 'ant-crm-conn-v1';
const PING_SESSION_TTL_MS = 5 * 60 * 1000;

export type ConnectionStatus = {
  ok: boolean;
  latencyMs: number;
  tables: Record<string, number>;
  error?: string;
};

type PingEntry = { at: number; result: ConnectionStatus };

let pingInflight: Promise<ConnectionStatus> | null = null;
let pingCached: PingEntry | null = null;

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof sessionStorage !== 'undefined';
}

function readSessionPing(): ConnectionStatus | null {
  if (!isBrowser()) return null;
  try {
    const raw = sessionStorage.getItem(PING_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PingEntry>;
    if (!parsed?.at || !parsed.result?.ok) return null;
    if (Date.now() - parsed.at >= PING_SESSION_TTL_MS) {
      sessionStorage.removeItem(PING_SESSION_KEY);
      return null;
    }
    return parsed.result;
  } catch {
    return null;
  }
}

function writeSessionPing(entry: PingEntry): void {
  if (!isBrowser()) return;
  try {
    if (entry.result.ok) sessionStorage.setItem(PING_SESSION_KEY, JSON.stringify(entry));
    else sessionStorage.removeItem(PING_SESSION_KEY);
  } catch {
    // Quota / private mode — the in-memory cache still applies for this page load.
  }
}

/** Fresh status without touching the network, or `null` when a real ping is needed. */
export function readCachedConnectionStatus(): ConnectionStatus | null {
  if (pingCached && Date.now() - pingCached.at < PING_CACHE_MS) return pingCached.result;
  return readSessionPing();
}

export async function checkSupabaseConnection(): Promise<ConnectionStatus> {
  if (!isRemoteDataEnabled()) {
    return { ok: false, latencyMs: 0, tables: {}, error: 'Supabase not enabled in .env.local' };
  }
  return withTimeout(
    supabaseDb.healthCheck(),
    PING_TIMEOUT_MS,
    { ok: false, latencyMs: PING_TIMEOUT_MS, tables: {}, error: 'Connection timeout — kiểm tra URL Supabase' }
  );
}

export function resetQuickSupabasePingCache(): void {
  pingInflight = null;
  pingCached = null;
  if (!isBrowser()) return;
  try {
    sessionStorage.removeItem(PING_SESSION_KEY);
  } catch {
    // Ignore — nothing to clear.
  }
}

export async function quickSupabasePing(): Promise<ConnectionStatus> {
  if (!isRemoteDataEnabled()) {
    return { ok: false, latencyMs: 0, tables: {}, error: 'Supabase not enabled in .env.local' };
  }
  const cached = readCachedConnectionStatus();
  if (cached) return cached;
  if (pingInflight) return pingInflight;

  pingInflight = withTimeout(
    supabaseDb.quickPing(),
    PING_TIMEOUT_MS,
    { ok: false, latencyMs: PING_TIMEOUT_MS, tables: {}, error: 'Connection timeout — kiểm tra URL Supabase' }
  )
    .then((result) => {
      const entry: PingEntry = { at: Date.now(), result };
      pingCached = entry;
      writeSessionPing(entry);
      return result;
    })
    .finally(() => {
      pingInflight = null;
    });

  return pingInflight;
}
