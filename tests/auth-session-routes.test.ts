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
let crmSessionCreateError: Error | null = null;
let crmSessionRevokeError: Error | null = null;
let revokedCookie: string | undefined;
let sessionCookie: string | null = null;
let crmSession: Record<string, unknown> | null = null;

type CookieResponse = {
  cookies: {
    set: (name: string, value: string, options: Record<string, unknown>) => void;
  };
};

mock.module(require.resolve('@supabase/supabase-js'), {
  namedExports: {
    createClient: () => ({
      auth: {
        signInWithPassword: async () => ({
          data: loginError
            ? { user: null, session: null }
            : {
              user: { id: 'user-1', email: 'user@example.com' },
              session: {
                access_token: 'access-token',
                refresh_token: 'refresh-token',
                expires_at: Math.floor(Date.now() / 1000) + 3600,
                expires_in: 3600,
              },
            },
          error: loginError,
        }),
      },
    }),
  },
});

mock.module(require.resolve('../lib/auth/crm-session'), {
  namedExports: {
    CRM_SESSION_COOKIE: 'crm_session',
    createCrmSession: async (input: Record<string, unknown>) => {
      if (crmSessionCreateError) throw crmSessionCreateError;
      return { session: { sid: 'session-1', ...input }, cookieValue: 'signed-crm-session' };
    },
    setCrmSessionCookie: (response: CookieResponse, value: string) => {
      response.cookies.set('crm_session', value, { httpOnly: true, path: '/' });
    },
    revokeCrmSession: async (value: string | undefined) => {
      revokedCookie = value;
      if (crmSessionRevokeError) throw crmSessionRevokeError;
    },
    clearCrmSessionCookie: (response: CookieResponse) => {
      response.cookies.set('crm_session', '', { maxAge: 0, path: '/' });
    },
    setCrmAccessCookies: async (response: CookieResponse) => {
      response.cookies.set('crm_access', 'signed-access-token', { httpOnly: true, path: '/' });
      response.cookies.set('crm_supabase_access', 'supabase-access-token', { httpOnly: true, path: '/' });
    },
    clearCrmAccessCookies: (response: CookieResponse) => {
      response.cookies.set('crm_access', '', { maxAge: 0, path: '/' });
      response.cookies.set('crm_supabase_access', '', { maxAge: 0, path: '/' });
    },
    getCrmSessionRevocationStatus: async () => 'active',
    getCrmSession: async () => crmSession,
  },
});

mock.module(require.resolve('next/headers'), {
  namedExports: {
    cookies: async () => ({
      get: () => sessionCookie ? { value: sessionCookie } : undefined,
    }),
  },
});

mock.module(require.resolve('../lib/auth/break-glass'), {
  namedExports: {
    checkBreakGlassCredentials: () => ({
      configured: false,
      usernameMatches: false,
      passwordMatches: false,
    }),
    clearBreakGlassCookie: (response: CookieResponse) => {
      response.cookies.set('bg_session', '', { maxAge: 0, path: '/' });
    },
  },
});
mock.module(require.resolve('../lib/auth/break-glass-supabase'), {
  namedExports: { getBreakGlassSupabaseSession: async () => null },
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
mock.module(require.resolve('../lib/auth/login-history'), {
  namedExports: { getLoginClientMetadata: () => ({}) },
});
mock.module(require.resolve('../lib/auth/login-history-store'), {
  namedExports: { recordSuccessfulLogin: async () => {} },
});
mock.module(require.resolve('../lib/env'), {
  namedExports: {
    getSupabaseUrl: () => 'https://supabase.example.test',
    getSupabaseAnonKey: () => 'anon-key',
    getCrmAccessTokenSecret: () => '',
    isBreakGlassConfigured: () => false,
  },
});
mock.module(require.resolve('../lib/supabase/insecure-fetch'), {
  namedExports: { getSupabaseGlobalFetchOptions: () => ({}) },
});

test('CRM auth session routes', async (t) => {
  const loginRoute = await import('../app/api/auth/login/route');
  const logoutRoute = await import('../app/api/auth/logout/route');
  const { getAuthContext } = await import('../lib/auth/session');

  await t.beforeEach(() => {
    loginError = null;
    crmSessionCreateError = null;
    crmSessionRevokeError = null;
    revokedCookie = undefined;
    sessionCookie = null;
    crmSession = null;
  });

  await t.test('returns an unauthenticated context without a CRM session', async () => {
    assert.deepEqual(await getAuthContext(), {
      authenticated: false,
      isSuperAdmin: false,
      isBreakGlass: false,
      userId: null,
      email: null,
    });
  });

  await t.test('exchanges a valid password login for a CRM cookie', async () => {
    const response = await loginRoute.POST(new Request('http://localhost/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identity: 'user@example.com', password: 'correct-password' }),
    }));

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { ok: true, mode: 'crm' });
    assert.match(response.headers.get('set-cookie') ?? '', /crm_session=signed-crm-session/);
  });

  await t.test('rejects an invalid password login', async () => {
    loginError = new Error('Invalid login credentials');
    const response = await loginRoute.POST(new Request('http://localhost/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identity: 'user@example.com', password: 'wrong-password' }),
    }));

    assert.equal(response.status, 401);
    const body = await response.json();
    assert.equal(body.ok, false);
    assert.match(body.error, /không đúng/);
  });

  await t.test('returns 503 when the durable session store cannot create a session', async () => {
    crmSessionCreateError = new Error('durable session store unavailable');
    const response = await loginRoute.POST(new Request('http://localhost/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identity: 'user@example.com', password: 'correct-password' }),
    }));

    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), {
      ok: false,
      error: 'Không thể tạo CRM session. Vui lòng thử lại.',
    });
    assert.doesNotMatch(response.headers.get('set-cookie') ?? '', /crm_session=/);
  });

  await t.test('revokes the CRM session on logout', async () => {
    const response = await logoutRoute.POST(new Request('http://localhost/api/auth/logout', {
      method: 'POST',
      headers: { Cookie: 'crm_session=signed-crm-session' },
    }));

    assert.equal(response.status, 200);
    assert.equal(revokedCookie, 'signed-crm-session');
    assert.match(response.headers.get('set-cookie') ?? '', /crm_session=;/);
  });

  await t.test('clears every auth cookie and returns 503 when durable revoke fails', async () => {
    crmSessionRevokeError = new Error('durable session store unavailable');
    const response = await logoutRoute.POST(new Request('http://localhost/api/auth/logout', {
      method: 'POST',
      headers: { Cookie: 'crm_session=signed-crm-session; bg_session=break-glass; sb-test-auth-token=legacy' },
    }));

    assert.equal(response.status, 503);
    assert.equal(revokedCookie, 'signed-crm-session');
    assert.deepEqual(await response.json(), {
      ok: false,
      error: 'Không thể thu hồi CRM session. Vui lòng thử lại.',
    });
    const setCookie = response.headers.get('set-cookie') ?? '';
    assert.match(setCookie, /crm_session=;/);
    assert.match(setCookie, /bg_session=;/);
    assert.match(setCookie, /sb-test-auth-token=;/);
  });
});
