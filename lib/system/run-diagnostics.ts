import { createServerClient } from '@supabase/ssr';
import { cookies, headers } from 'next/headers';
import {
  getAuthCaptchaSiteKey,
  getSupabaseAnonKey,
  getSupabaseUrl,
  isRemoteDataEnabled,
  isSupabaseReadOnly,
  isUseSupabaseEnabled,
} from '@/lib/env';
import { maskSecret } from './debug-config';
import { debugLog } from './debug-logger';

export type DiagnosticCheck = {
  name: string;
  ok: boolean;
  latencyMs?: number;
  error?: string;
  hint?: string;
  details?: Record<string, unknown>;
};

export type DiagnosticsReport = {
  generatedAt: string;
  checks: DiagnosticCheck[];
  summary: { passed: number; failed: number; total: number };
};

async function timedFetch(
  label: string,
  url: string,
  init?: RequestInit
): Promise<{ ok: boolean; latencyMs: number; status?: number; error?: string; body?: string }> {
  const start = Date.now();
  try {
    const res = await fetch(url, { ...init, signal: AbortSignal.timeout(10_000) });
    const latencyMs = Date.now() - start;
    let body = '';
    try {
      body = (await res.text()).slice(0, 200);
    } catch {
      /* ignore */
    }
    return { ok: res.ok, latencyMs, status: res.status, body };
  } catch (e) {
    const latencyMs = Date.now() - start;
    const msg = e instanceof Error ? e.message : String(e);
    debugLog('diagnostics', `${label} fetch failed`, { level: 'error', meta: { error: msg } });
    return { ok: false, latencyMs, error: msg };
  }
}

function checkEnv(): DiagnosticCheck {
  const url = getSupabaseUrl();
  const key = getSupabaseAnonKey();
  const issues: string[] = [];
  const hints: string[] = [];

  if (!url) {
    issues.push('NEXT_PUBLIC_SUPABASE_URL chưa set');
    hints.push('Thêm URL từ Supabase Dashboard → Settings → API');
  } else if (!url.startsWith('https://')) {
    issues.push('SUPABASE_URL không dùng https');
    hints.push('URL phải bắt đầu bằng https://');
  }

  if (!key) {
    issues.push('NEXT_PUBLIC_SUPABASE_ANON_KEY chưa set');
    hints.push('Thêm anon key từ Supabase Dashboard');
  }

  return {
    name: 'Environment',
    ok: issues.length === 0,
    error: issues.length ? issues.join('; ') : undefined,
    hint: hints.length ? hints.join(' ') : undefined,
    details: {
      supabaseUrl: url ? `${url.slice(0, 30)}...` : '(empty)',
      anonKey: maskSecret(key),
      useSupabase: isUseSupabaseEnabled(),
      remoteData: isRemoteDataEnabled(),
      readOnly: isSupabaseReadOnly(),
      captchaConfigured: Boolean(getAuthCaptchaSiteKey()),
      nodeEnv: process.env.NODE_ENV ?? 'unknown',
      appVersion: process.env.NEXT_PUBLIC_APP_VERSION ?? 'unknown',
    },
  };
}

async function checkProxyHeaders(): Promise<DiagnosticCheck> {
  const h = await headers();
  const host = h.get('host') ?? '(missing)';
  const forwardedProto = h.get('x-forwarded-proto') ?? '(missing)';
  const forwardedHost = h.get('x-forwarded-host') ?? '(missing)';

  const issues: string[] = [];
  if (forwardedProto === '(missing)' && process.env.NODE_ENV === 'production') {
    issues.push('Thiếu X-Forwarded-Proto — nginx/proxy có thể chưa cấu hình đúng');
  }
  if (forwardedProto === 'http' && host !== 'localhost:3006' && !host.startsWith('127.0.0.1')) {
    issues.push('X-Forwarded-Proto=http trên production — SSL termination có thể sai');
  }

  return {
    name: 'Proxy headers',
    ok: issues.length === 0,
    error: issues.length ? issues.join('; ') : undefined,
    hint: issues.length
      ? 'Kiểm tra nginx: proxy_set_header X-Forwarded-Proto $scheme;'
      : undefined,
    details: { host, xForwardedProto: forwardedProto, xForwardedHost: forwardedHost },
  };
}

async function checkSupabaseAuthHealth(): Promise<DiagnosticCheck> {
  const url = getSupabaseUrl();
  if (!url) {
    return {
      name: 'Supabase Auth reachability',
      ok: false,
      error: 'Không có SUPABASE_URL',
      hint: 'Set env trước khi test kết nối',
    };
  }

  const result = await timedFetch('auth-health', `${url.replace(/\/$/, '')}/auth/v1/health`, {
    method: 'GET',
  });

  const sslLike =
    result.error &&
    /ssl|tls|cert|handshake|UNABLE_TO_VERIFY|DEPTH_ZERO_SELF_SIGNED|ERR_SSL/i.test(result.error);

  return {
    name: 'Supabase Auth reachability',
    ok: result.ok && !result.error,
    latencyMs: result.latencyMs,
    error: result.error ?? (result.ok ? undefined : `HTTP ${result.status}`),
    hint: sslLike
      ? 'Lỗi SSL/TLS khi server gọi ra Supabase — kiểm tra firewall outbound hoặc cert trên server'
      : result.error
        ? 'Server không reach được Supabase Auth — kiểm tra DNS, firewall, URL'
        : undefined,
    details: { status: result.status, bodyPreview: result.body?.slice(0, 100) },
  };
}

async function checkSupabaseRest(): Promise<DiagnosticCheck> {
  const url = getSupabaseUrl();
  const key = getSupabaseAnonKey();
  if (!url || !key) {
    return {
      name: 'Supabase REST reachability',
      ok: false,
      error: 'Thiếu URL hoặc anon key',
    };
  }

  const restUrl = `${url.replace(/\/$/, '')}/rest/v1/customers?select=id&limit=1`;
  const result = await timedFetch('rest-customers', restUrl, {
    method: 'GET',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
    },
  });

  const rlsBlocked = result.status === 401 || result.status === 403;

  return {
    name: 'Supabase REST reachability',
    ok: !result.error && (result.ok || rlsBlocked),
    latencyMs: result.latencyMs,
    error: result.error ?? (result.ok || rlsBlocked ? undefined : `HTTP ${result.status}`),
    hint: rlsBlocked
      ? 'Kết nối OK nhưng bị RLS/auth chặn (expected nếu chưa login) — không phải lỗi SSL'
      : result.error
        ? 'Không gọi được Supabase REST API từ server'
        : undefined,
    details: { status: result.status, rlsOrAuthBlock: rlsBlocked },
  };
}

async function checkSession(): Promise<DiagnosticCheck> {
  const url = getSupabaseUrl();
  const key = getSupabaseAnonKey();
  if (!url || !key) {
    return {
      name: 'Auth session',
      ok: false,
      error: 'Thiếu Supabase env',
    };
  }

  const start = Date.now();
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(url, key, {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {
          /* read-only diagnostics */
        },
      },
    });

    const { data, error } = await supabase.auth.getUser();
    const latencyMs = Date.now() - start;

    if (error) {
      return {
        name: 'Auth session',
        ok: false,
        latencyMs,
        error: error.message,
        hint: 'Chưa có session hợp lệ hoặc cookie hết hạn',
        details: { hasUser: false },
      };
    }

    return {
      name: 'Auth session',
      ok: Boolean(data.user),
      latencyMs,
      error: data.user ? undefined : 'Không có user trong session',
      hint: data.user ? undefined : 'Bình thường nếu chưa đăng nhập',
      details: {
        hasUser: Boolean(data.user),
        userId: data.user?.id ? maskSecret(data.user.id, 8, 4) : null,
        email: data.user?.email ?? null,
      },
    };
  } catch (e) {
    return {
      name: 'Auth session',
      ok: false,
      latencyMs: Date.now() - start,
      error: e instanceof Error ? e.message : 'Session check failed',
    };
  }
}

export async function runDiagnostics(): Promise<DiagnosticsReport> {
  debugLog('diagnostics', 'Running full diagnostics');

  const checks: DiagnosticCheck[] = [
    checkEnv(),
    await checkProxyHeaders(),
    await checkSupabaseAuthHealth(),
    await checkSupabaseRest(),
    await checkSession(),
  ];

  const passed = checks.filter((c) => c.ok).length;
  const failed = checks.length - passed;

  debugLog('diagnostics', 'Diagnostics complete', {
    meta: { passed, failed, total: checks.length },
  });

  return {
    generatedAt: new Date().toISOString(),
    checks,
    summary: { passed, failed, total: checks.length },
  };
}
