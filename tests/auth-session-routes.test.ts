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
let signOutCalls = 0;
let breakGlassEnabled = false;
let breakGlassSessionUserThrows = false;
let lastSecurityAuditUserId: string | null | undefined;
const loginLogs: Array<{ level: 'info' | 'warn' | 'error'; entry: Record<string, unknown>; message: string }> = [];

function breakGlassSession() {
  const session = {
    access_token: 'break-glass-access-token',
    refresh_token: 'break-glass-refresh-token',
    expires_at: Math.floor(Date.now() / 1000) + 600,
    expires_in: 600,
  };
  if (breakGlassSessionUserThrows) {
    Object.defineProperty(session, 'user', {
      get() {
        throw new Error('tokens-only session user is unavailable');
      },
    });
  }
  return session;
}

mock.module(require.resolve('next/headers'), {
  namedExports: {
    cookies: async () => ({ get: () => undefined }),
  },
});

type CookieResponse = {
  cookies: {
    set: (name: string, value: string, options: Record<string, unknown>) => void;
  };
};

type CapturedLogger = {
  info: (entry: Record<string, unknown>, message: string) => void;
  warn: (entry: Record<string, unknown>, message: string) => void;
  error: (entry: Record<string, unknown>, message: string) => void;
};

mock.module(require.resolve('../lib/auth/supabase-ssr'), {
  namedExports: {
    SUPABASE_ACCESS_COOKIE: 'sb-crm-access-token',
    createSupabaseRouteClient: () => ({
      auth: {
        signInWithPassword: async () => ({
          data: loginError
            ? { user: null, session: null }
            : {
              user: { id: 'user-1', email: 'user@example.com' },
              session: {
                access_token: 'supabase-access-token',
                refresh_token: 'supabase-refresh-token',
                expires_at: Math.floor(Date.now() / 1000) + 600,
                expires_in: 600,
              },
            },
          error: loginError,
        }),
        setSession: async () => ({
          data: { session: breakGlassSession() },
          error: null,
        }),
        signOut: async () => {
          signOutCalls++;
          return { error: null };
        },
      },
    }),
    setSupabaseAccessCookie: (response: CookieResponse) => {
      response.cookies.set('sb-crm-access-token', 'supabase-access-token', {
        httpOnly: true,
        path: '/',
      });
    },
    clearSupabaseAccessCookie: (response: CookieResponse) => {
      response.cookies.set('sb-crm-access-token', '', { maxAge: 0, path: '/' });
    },
    clearLegacyCrmAuthCookies: (response: CookieResponse) => {
      response.cookies.set('crm_session', '', { maxAge: 0, path: '/' });
      response.cookies.set('crm_access', '', { maxAge: 0, path: '/' });
      response.cookies.set('crm_supabase_access', '', { maxAge: 0, path: '/' });
    },
  },
});
mock.module(require.resolve('../lib/auth/break-glass'), {
  namedExports: {
    checkBreakGlassCredentials: () => ({
      configured: breakGlassEnabled,
      usernameMatches: breakGlassEnabled,
      passwordMatches: breakGlassEnabled,
    }),
  },
});
mock.module(require.resolve('../lib/auth/break-glass-supabase'), {
  namedExports: {
    getBreakGlassSupabaseSession: async () => (
      breakGlassEnabled ? breakGlassSession() : null
    ),
    ensureBreakGlassShadowPrivilegesOnce: async () => {},
    isBreakGlassShadowEmail: () => false,
  },
});
mock.module(require.resolve('../lib/auth/cookie-hygiene'), {
  namedExports: {
    clearSupabaseAuthCookies: (response: CookieResponse) => {
      response.cookies.set('sb-test-auth-token', '', { maxAge: 0, path: '/' });
    },
  },
});
mock.module(require.resolve('../lib/auth/rate-limit'), {
  namedExports: {
    getClientIp: () => '127.0.0.1',
    checkLoginRateLimit: async () => ({ ok: true }),
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
  namedExports: {
    recordAuthSecurityEvent: async (input: { userId?: string | null }) => {
      lastSecurityAuditUserId = input.userId;
    },
  },
});
mock.module(require.resolve('../lib/system/debug-logger'), {
  namedExports: { debugLog: () => {} },
});
mock.module(require.resolve('../lib/system/server-logger'), {
  namedExports: {
    withHttpRequestLogging: (
      _context: Record<string, unknown>,
      handler: (
        request: Request,
        routeContext: { params: Promise<Record<string, never>> },
        requestLog: { logger: CapturedLogger },
      ) => Promise<Response>,
    ) => async (request: Request, routeContext?: { params: Promise<Record<string, never>> }) => {
      const logger = {
        info: (entry: Record<string, unknown>, message: string) => loginLogs.push({ level: 'info', entry, message }),
        warn: (entry: Record<string, unknown>, message: string) => loginLogs.push({ level: 'warn', entry, message }),
        error: (entry: Record<string, unknown>, message: string) => loginLogs.push({ level: 'error', entry, message }),
      };
      const response = await handler(request, routeContext ?? { params: Promise.resolve({}) }, { logger });
      response.headers.set('X-Request-Id', 'logout-request-42');
      return response;
    },
  },
});

test('Supabase auth session routes', async (t) => {
  const loginRoute = await import('../app/api/auth/login/route');
  const logoutRoute = await import('../app/api/auth/logout/route');
  const { getAuthContext } = await import('../lib/auth/session');

  await t.beforeEach(() => {
    loginError = null;
    signOutCalls = 0;
    breakGlassEnabled = false;
    breakGlassSessionUserThrows = false;
    lastSecurityAuditUserId = undefined;
    loginLogs.length = 0;
  });

  await t.test('returns an unauthenticated context without a Supabase access token', async () => {
    assert.deepEqual(await getAuthContext(), {
      authenticated: false,
      isSuperAdmin: false,
      isBreakGlass: false,
      userId: null,
      email: null,
    });
  });

  await t.test('exchanges a valid password login for Supabase-only cookies', async () => {
    const response = await loginRoute.POST(new Request('http://localhost/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: 'http://localhost' },
      body: JSON.stringify({ identity: 'user@example.com', password: 'correct-password' }),
    }), { params: Promise.resolve({}) });

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { ok: true, mode: 'crm' });
    assert.match(response.headers.get('set-cookie') ?? '', /sb-crm-access-token=supabase-access-token/);
    assert.deepEqual(loginLogs, [{
      level: 'info',
      entry: { event: 'auth.login.succeeded', authMethod: 'password', actorId: 'user-1' },
      message: 'Login succeeded',
    }]);
  });

  await t.test('break-glass login succeeds when tokens-only session.user is unavailable', async () => {
    breakGlassEnabled = true;
    breakGlassSessionUserThrows = true;
    const response = await loginRoute.POST(new Request('http://localhost/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: 'http://localhost' },
      body: JSON.stringify({ identity: 'recovery-admin', password: 'recovery-password' }),
    }), { params: Promise.resolve({}) });

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { ok: true, mode: 'break_glass' });
    assert.equal(lastSecurityAuditUserId, null);
    assert.deepEqual(loginLogs, [{
      level: 'info',
      entry: { event: 'auth.login.succeeded', authMethod: 'break_glass' },
      message: 'Login succeeded',
    }]);
  });

  await t.test('rejects an invalid password login', async () => {
    loginError = new Error('Invalid login credentials');
    const response = await loginRoute.POST(new Request('http://localhost/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: 'http://localhost' },
      body: JSON.stringify({ identity: 'user@example.com', password: 'wrong-password' }),
    }), { params: Promise.resolve({}) });

    assert.equal(response.status, 401);
    const body = await response.json();
    assert.equal(body.ok, false);
    assert.match(body.error, /không đúng/);
    assert.deepEqual(loginLogs, [{
      level: 'warn',
      entry: {
        event: 'auth.login.rejected',
        statusCode: 401,
        authMethod: 'password',
        reason: 'invalid_credentials',
      },
      message: 'Login rejected',
    }]);
    assert.doesNotMatch(JSON.stringify(loginLogs), /user@example\.com|wrong-password/);
  });

  await t.test('signs out at Supabase and clears every browser auth cookie', async () => {
    const response = await logoutRoute.POST(
      new Request('http://localhost/api/auth/logout', {
        method: 'POST',
        headers: {
          Cookie: 'sb-crm-access-token=supabase-access-token; sb-test-auth-token=legacy',
          Origin: 'http://localhost',
        },
      }),
      { params: Promise.resolve({}) },
    );

    assert.equal(response.status, 200);
    assert.equal(signOutCalls, 1);
    const setCookie = response.headers.get('set-cookie') ?? '';
    assert.match(setCookie, /sb-crm-access-token=;/);
    assert.match(setCookie, /sb-test-auth-token=;/);
    assert.match(setCookie, /crm_session=;/);
  });
});
