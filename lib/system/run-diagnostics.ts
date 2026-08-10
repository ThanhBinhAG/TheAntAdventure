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
import { getSupabaseFetch, getSupabaseGlobalFetchOptions } from '@/lib/supabase/insecure-fetch';
import { isSupabaseTlsInsecureEnabled } from '@/lib/supabase/tls-config';
import { maskSecret } from './debug-config';
import { debugLog } from './debug-logger';
import { isExpectedUnauthenticatedSessionError } from './session-diag';
import { estimateCookieHeaderBytes } from '@/lib/auth/cookie-hygiene';

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

function serializeFetchError(e: unknown): {
  message: string;
  causeMessage?: string;
  causeCode?: string;
  causeErrno?: string | number;
} {
  const err = e instanceof Error ? e : new Error(String(e));
  const cause = err.cause;
  if (!cause || typeof cause !== 'object') {
    return { message: err.message };
  }
  const c = cause as Record<string, unknown>;
  return {
    message: err.message,
    causeMessage: cause instanceof Error ? cause.message : c.message != null ? String(c.message) : undefined,
    causeCode: c.code != null ? String(c.code) : undefined,
    causeErrno: (c.errno as string | number | undefined) ?? undefined,
  };
}

function connectivityHint(serialized: ReturnType<typeof serializeFetchError>): string {
  const blob = `${serialized.message} ${serialized.causeMessage ?? ''} ${serialized.causeCode ?? ''}`;
  if (/ssl|tls|cert|handshake|UNABLE_TO_VERIFY|DEPTH_ZERO_SELF_SIGNED|ERR_TLS|certificate/i.test(blob)) {
    return 'Lỗi SSL/TLS khi server gọi Supabase — bật SUPABASE_TLS_INSECURE hoặc cài CA tin cậy trên server';
  }
  if (/ECONNREFUSED|ECONNRESET/i.test(blob)) {
    return 'Kết nối bị từ chối — kiểm tra host/port Supabase và firewall outbound';
  }
  if (/ENOTFOUND|EAI_AGAIN|getaddrinfo/i.test(blob)) {
    return 'DNS không resolve được host Supabase — kiểm tra DNS trên server';
  }
  return 'Server không reach được Supabase — kiểm tra DNS, firewall, URL, TLS';
}

async function timedFetch(
  label: string,
  url: string,
  init?: RequestInit
): Promise<{
  ok: boolean;
  latencyMs: number;
  status?: number;
  error?: string;
  body?: string;
  errorDetails?: ReturnType<typeof serializeFetchError>;
}> {
  const start = Date.now();
  const doFetch = getSupabaseFetch();
  try {
    const res = await doFetch(url, { ...init, signal: AbortSignal.timeout(10_000) });
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
    const errorDetails = serializeFetchError(e);
    debugLog('diagnostics', `${label} fetch failed`, {
      level: 'error',
      meta: { error: errorDetails.message, ...errorDetails, url },
    });
    return { ok: false, latencyMs, error: errorDetails.message, errorDetails };
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
      tlsInsecure: isSupabaseTlsInsecureEnabled(),
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

  const target = `${url.replace(/\/$/, '')}/auth/v1/health`;
  let targetHost = '(invalid)';
  try {
    targetHost = new URL(target).host;
  } catch {
    /* ignore */
  }

  const result = await timedFetch('auth-health', target, { method: 'GET' });

  return {
    name: 'Supabase Auth reachability',
    ok: result.ok && !result.error,
    latencyMs: result.latencyMs,
    error: result.error ?? (result.ok ? undefined : `HTTP ${result.status}`),
    hint: result.errorDetails
      ? connectivityHint(result.errorDetails)
      : result.error
        ? 'Server không reach được Supabase Auth — kiểm tra DNS, firewall, URL'
        : undefined,
    details: {
      targetHost,
      targetPath: '/auth/v1/health',
      status: result.status,
      bodyPreview: result.body?.slice(0, 100),
      ...(result.errorDetails ?? {}),
    },
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
  let targetHost = '(invalid)';
  try {
    targetHost = new URL(restUrl).host;
  } catch {
    /* ignore */
  }

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
      : result.errorDetails
        ? connectivityHint(result.errorDetails)
        : result.error
          ? 'Không gọi được Supabase REST API từ server'
          : undefined,
    details: {
      targetHost,
      targetPath: '/rest/v1/customers',
      status: result.status,
      rlsOrAuthBlock: rlsBlocked,
      ...(result.errorDetails ?? {}),
    },
  };
}

function isMissingSessionError(message: string): boolean {
  return isExpectedUnauthenticatedSessionError(message);
}

export { isExpectedUnauthenticatedSessionError } from './session-diag';

async function checkCookieHeaderSize(): Promise<DiagnosticCheck> {
  const h = await headers();
  const cookieHeader = h.get('cookie');
  const { bytes, cookieCount, authChunkCount, hasBreakGlass } =
    estimateCookieHeaderBytes(cookieHeader);

  // Default nginx large_client_header_buffers is often 4×8k; warn before that.
  const WARN_BYTES = 6 * 1024;
  const FAIL_BYTES = 12 * 1024;
  const ok = bytes < FAIL_BYTES;
  const issues: string[] = [];
  if (bytes >= FAIL_BYTES) {
    issues.push(
      `Cookie header ~${bytes} bytes — có thể gây 400/502 với nginx large_client_header_buffers`
    );
  } else if (bytes >= WARN_BYTES) {
    issues.push(`Cookie header ~${bytes} bytes — gần ngưỡng buffer nginx`);
  }

  return {
    name: 'Cookie header size',
    ok,
    error: !ok ? issues.join('; ') : undefined,
    hint:
      issues.length || authChunkCount > 2
        ? [
            ...issues,
            'Logout/login lại để dọn sb-*-auth-token chunks; trên nginx tăng large_client_header_buffers (vd. 4 16k). localStorage/sessionStorage không gửi lên proxy.',
          ].join(' ')
        : undefined,
    details: {
      bytes,
      cookieCount,
      authChunkCount,
      hasBreakGlass,
      warnBytes: WARN_BYTES,
      failBytes: FAIL_BYTES,
    },
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
      ...getSupabaseGlobalFetchOptions(),
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
      if (isMissingSessionError(error.message)) {
        return {
          name: 'Auth session',
          ok: true,
          latencyMs,
          hint: 'Chưa đăng nhập — bình thường trên trang debug',
          details: { hasUser: false, expectedWithoutLogin: true },
        };
      }

      const networkLike = /fetch failed|failed to fetch|network|ssl|tls|certificate/i.test(error.message);
      return {
        name: 'Auth session',
        ok: false,
        latencyMs,
        error: error.message,
        hint: networkLike
          ? 'Không gọi được Auth để kiểm tra session — xem Auth reachability'
          : 'Session không hợp lệ hoặc cookie hết hạn',
        details: { hasUser: false },
      };
    }

    return {
      name: 'Auth session',
      ok: true,
      latencyMs,
      hint: data.user ? undefined : 'Chưa đăng nhập — bình thường trên trang debug',
      details: {
        hasUser: Boolean(data.user),
        expectedWithoutLogin: !data.user,
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
    await checkCookieHeaderSize(),
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
