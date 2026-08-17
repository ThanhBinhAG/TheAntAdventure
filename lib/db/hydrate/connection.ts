import { isRemoteDataEnabled } from '../../env';
import { db as supabaseDb } from '../supabase';
import { withTimeout } from '../timeout';

const PING_TIMEOUT_MS = 8_000;
/** Reuse a successful ping briefly so Strict Mode remount / double-mount does not hit the network twice. */
const PING_CACHE_MS = 15_000;

export type ConnectionStatus = {
  ok: boolean;
  latencyMs: number;
  tables: Record<string, number>;
  error?: string;
};

let pingInflight: Promise<ConnectionStatus> | null = null;
let pingCached: { at: number; result: ConnectionStatus } | null = null;

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
}

export async function quickSupabasePing(): Promise<ConnectionStatus> {
  if (!isRemoteDataEnabled()) {
    return { ok: false, latencyMs: 0, tables: {}, error: 'Supabase not enabled in .env.local' };
  }
  if (pingCached && Date.now() - pingCached.at < PING_CACHE_MS) {
    return pingCached.result;
  }
  if (pingInflight) return pingInflight;

  pingInflight = withTimeout(
    supabaseDb.quickPing(),
    PING_TIMEOUT_MS,
    { ok: false, latencyMs: PING_TIMEOUT_MS, tables: {}, error: 'Connection timeout — kiểm tra URL Supabase' }
  )
    .then((result) => {
      pingCached = { at: Date.now(), result };
      return result;
    })
    .finally(() => {
      pingInflight = null;
    });

  return pingInflight;
}
