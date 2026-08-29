import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test, { mock } from 'node:test';

const require = createRequire(import.meta.url);
const serverOnlyPath = require.resolve('server-only');
require.cache[serverOnlyPath] = {
  id: serverOnlyPath,
  filename: serverOnlyPath,
  loaded: true,
  exports: {},
} as NodeModule;

let loginError: Error | null = null;
let refreshError: { status?: number; message: string } | null = null;
let refreshSession: Record<string, unknown> | null = null;
let createdInput: Record<string, unknown> | null = null;
let rotatedInput: Record<string, unknown> | null = null;
let revokedToken: string | null = null;
let storedSession: Record<string, unknown> | null = null;

mock.module(require.resolve('../lib/auth/crm-session-repository'), {
  namedExports: {
    getCrmSessionRepository: () => ({
      create: async (input: Record<string, unknown>) => {
        createdInput = input;
        return { id: 'crm-session-1', token: 'opaque-crm-session-token' };
      },
      lookup: async () => storedSession,
      rotateCredentials: async (input: Record<string, unknown>) => { rotatedInput = input; },
      revoke: async (token: string) => { revokedToken = token; },
      cleanupExpired: async () => {},
    }),
  },
});
mock.module(require.resolve('../lib/auth/supabase-auth-server'), {
  namedExports: {
    createSupabaseAuthClient: () => ({
      auth: {
        signInWithPassword: async () => ({
          data: loginError ? { user: null, session: null } : {
            user: { id: 'user-1', email: 'user@example.com' },
            session: {
              access_token: 'supabase-access-token',
              refresh_token: 'supabase-refresh-token',
              expires_at: Math.floor(Date.now() / 1000) + 600,
            },
          },
          error: loginError,
        }),
        refreshSession: async () => ({ data: { session: refreshSession }, error: refreshError }),
      },
    }),
  },
});
mock.module(require.resolve('../lib/auth/break-glass'), {
  namedExports: {
    checkBreakGlassCredentials: () => ({ configured: false, usernameMatches: false, passwordMatches: false }),
  },
});
mock.module(require.resolve('../lib/auth/break-glass-supabase'), {
  namedExports: { getBreakGlassSupabaseSession: async () => null },
});
mock.module(require.resolve('../lib/auth/rate-limit'), {
  namedExports: {
    getClientIp: () => '127.0.0.1',
    checkLoginRateLimit: async () => ({ ok: true }),
    consumeRefreshRateLimit: async () => ({ ok: true }),
    clearLoginFailures: async () => {},
    recordLoginFailure: async () => {},
  },
});
mock.module(require.resolve('../lib/auth/request-origin'), {
  namedExports: { hasTrustedRequestOrigin: () => true },
});
mock.module(require.resolve('../lib/auth/login-history'), {
  namedExports: { getLoginClientMetadata: () => ({}) },
});
mock.module(require.resolve('../lib/auth/login-history-store'), {
  namedExports: { recordSuccessfulLogin: async () => {} },
});
mock.module(require.resolve('../lib/auth/security-audit'), {
  namedExports: { recordAuthSecurityEvent: async () => {} },
});
mock.module(require.resolve('../lib/system/debug-logger'), {
  namedExports: { debugLog: () => {} },
});
mock.module(require.resolve('../lib/system/server-logger'), {
  namedExports: {
    withHttpRequestLogging: (
      _metadata: Record<string, unknown>,
      handler: (request: Request, context: { params: Promise<Record<string, never>> }, tools: { logger: Record<string, () => void> }) => Promise<Response>,
    ) => (request: Request, context = { params: Promise.resolve({}) }) => handler(request, context, {
      logger: { info: () => {}, warn: () => {}, error: () => {} },
    }),
  },
});

test('CRM auth routes keep Supabase credentials server-side', async (t) => {
  const loginRoute = await import('../app/api/auth/login/route');
  const refreshRoute = await import('../app/api/auth/refresh/route');
  const logoutRoute = await import('../app/api/auth/logout/route');

  await t.beforeEach(() => {
    loginError = null;
    refreshError = null;
    refreshSession = {
      access_token: 'new-supabase-access-token',
      refresh_token: 'new-supabase-refresh-token',
      expires_at: Math.floor(Date.now() / 1000) + 600,
    };
    createdInput = null;
    rotatedInput = null;
    revokedToken = null;
    storedSession = {
      id: 'crm-session-1',
      userId: 'user-1',
      accessToken: 'supabase-access-token',
      refreshToken: 'supabase-refresh-token',
      accessTokenExpiresAt: new Date('2030-01-01T00:05:00.000Z'),
      expiresAt: new Date('2030-01-31T00:00:00.000Z'),
    };
  });

  await t.test('login stores credentials durably and returns only an opaque CRM cookie', async () => {
    const response = await loginRoute.POST(new Request('http://localhost/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: 'http://localhost' },
      body: JSON.stringify({ identity: 'user@example.com', password: 'correct-password' }),
    }), { params: Promise.resolve({}) });

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { ok: true, mode: 'crm' });
    assert.equal(createdInput?.accessToken, 'supabase-access-token');
    assert.equal(createdInput?.refreshToken, 'supabase-refresh-token');
    const setCookie = response.headers.get('set-cookie') ?? '';
    assert.match(setCookie, /crm_session=opaque-crm-session-token/);
    assert.doesNotMatch(setCookie, /supabase-access-token|supabase-refresh-token|sb-/);
  });

  await t.test('refresh rotates durable server credentials without serializing them', async () => {
    const response = await refreshRoute.POST(new Request('http://localhost/api/auth/refresh', {
      method: 'POST',
      headers: { Cookie: 'crm_session=opaque-crm-session-token', Origin: 'http://localhost' },
    }), { params: Promise.resolve({}) });

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { ok: true });
    assert.equal(rotatedInput?.token, 'opaque-crm-session-token');
    assert.equal(rotatedInput?.accessToken, 'new-supabase-access-token');
    assert.equal(rotatedInput?.refreshToken, 'new-supabase-refresh-token');
  });

  await t.test('logout revokes the durable session and clears the opaque cookie', async () => {
    const response = await logoutRoute.POST(new Request('http://localhost/api/auth/logout', {
      method: 'POST',
      headers: { Cookie: 'crm_session=opaque-crm-session-token; sb-old-auth-token=legacy', Origin: 'http://localhost' },
    }), { params: Promise.resolve({}) });

    assert.equal(response.status, 200);
    assert.equal(revokedToken, 'opaque-crm-session-token');
    assert.match(response.headers.get('set-cookie') ?? '', /crm_session=;.*Max-Age=0/);
  });
});
