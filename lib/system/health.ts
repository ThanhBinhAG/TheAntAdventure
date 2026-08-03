import 'server-only';
import { getSupabaseAnonKey, getSupabaseUrl } from '@/lib/env';

export type HealthStatus = 'ok' | 'degraded' | 'error';

export type HealthReport = {
  status: HealthStatus;
  ts: string;
  app: { ok: true; version: string };
  db: {
    ok: boolean;
    latencyMs: number;
    error?: string;
  };
};

/**
 * Lightweight readiness probe: process is up + Supabase Auth is reachable.
 * Uses the public Auth health endpoint (no user session / RLS required).
 * Prefer this over browser-client quickPing for unauthenticated monitors.
 */
export async function runHealthCheck(): Promise<HealthReport> {
  const ts = new Date().toISOString();
  const version = process.env.NEXT_PUBLIC_APP_VERSION ?? 'unknown';
  const url = getSupabaseUrl();
  const key = getSupabaseAnonKey();

  if (!url || !key) {
    return {
      status: 'error',
      ts,
      app: { ok: true, version },
      db: { ok: false, latencyMs: 0, error: 'Supabase env not configured' },
    };
  }

  const start = Date.now();
  try {
    const res = await fetch(`${url.replace(/\/$/, '')}/auth/v1/health`, {
      method: 'GET',
      headers: { apikey: key },
      signal: AbortSignal.timeout(8_000),
    });
    const latencyMs = Date.now() - start;
    if (!res.ok) {
      return {
        status: 'degraded',
        ts,
        app: { ok: true, version },
        db: { ok: false, latencyMs, error: `Auth health HTTP ${res.status}` },
      };
    }
    return {
      status: 'ok',
      ts,
      app: { ok: true, version },
      db: { ok: true, latencyMs },
    };
  } catch (e) {
    return {
      status: 'error',
      ts,
      app: { ok: true, version },
      db: {
        ok: false,
        latencyMs: Date.now() - start,
        error: e instanceof Error ? e.message : 'Health ping failed',
      },
    };
  }
}
