import 'server-only';

import { checkRedisHealth, type RedisHealth } from '@/lib/redis/client';
import { getSupabaseAnonKey, getSupabaseUrl } from '@/lib/server/env/supabase';
import { getAppVersion } from '@/lib/server/env/app';
import {
  getProcessMemoryMetrics,
  type ProcessMemoryMetrics,
} from '@/lib/system/process-memory';

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
  redis: RedisHealth;
  memory: ProcessMemoryMetrics;
};

/**
 * Lightweight readiness probe: process is up + Supabase Auth is reachable.
 * Uses the public Auth health endpoint (no user session / RLS required).
 * Prefer this over browser-client quickPing for unauthenticated monitors.
 * Marks `degraded` when V8 heap used/limit ≥ HEAP_USED_RATIO_THRESHOLD (0.85).
 */
export async function runHealthCheck(): Promise<HealthReport> {
  const redisPromise = checkRedisHealth();
  const ts = new Date().toISOString();
  const version = getAppVersion();
  const memory = getProcessMemoryMetrics();

  const url = getSupabaseUrl();
  const key = getSupabaseAnonKey();

  if (!url || !key) {
    return {
      status: 'error',
      ts,
      app: { ok: true, version },
      db: { ok: false, latencyMs: 0, error: 'Supabase env not configured' },
      redis: await redisPromise,
      memory,
    };
  }

  const startedAt = Date.now();

  try {
    const response = await fetch(`${url.replace(/\/$/, '')}/auth/v1/health`, {
      method: 'GET',
      headers: { apikey: key },
      signal: AbortSignal.timeout(8_000),
    });

    const latencyMs = Date.now() - startedAt;
    const redis = await redisPromise;

    if (!response.ok) {
      return {
        status: 'degraded',
        ts,
        app: { ok: true, version },
        db: { ok: false, latencyMs, error: `Auth health HTTP ${response.status}` },
        redis,
        memory,
      };
    }

    const status: HealthStatus =
      memory.pressure || (redis.configured && !redis.ok) ? 'degraded' : 'ok';
    return {
      status,
      ts,
      app: { ok: true, version },
      db: { ok: true, latencyMs },
      redis,
      memory,
    };
  } catch (error) {
    return {
      status: 'error',
      ts,
      app: { ok: true, version },
      db: {
        ok: false,
        latencyMs: Date.now() - startedAt,
        error: error instanceof Error ? error.message : 'Health ping failed',
      },
      redis: await redisPromise,
      memory,
    };
  }
}
