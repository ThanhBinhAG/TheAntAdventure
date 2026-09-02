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

let authenticated = true;
let readAllowed = true;
const calls: unknown[] = [];
const preferences = {
  travelStyles: [{ code: 'luxury', label: 'Luxury', sortOrder: 10, isActive: true }],
  hotelTiers: ['4★'],
};

mock.module(require.resolve('../lib/auth/session'), {
  namedExports: {
    getAuthContext: async () => ({
      authenticated,
      isSuperAdmin: false,
      isBreakGlass: false,
      userId: authenticated ? 'tour-reader' : null,
      email: authenticated ? 'reader@example.com' : null,
    }),
  },
});

mock.module(require.resolve('../lib/auth/permissions-server'), {
  namedExports: {
    checkPermissionForRequest: async () => {
      if (!authenticated) return { allowed: false, status: 401 };
      return readAllowed ? { allowed: true } : { allowed: false, status: 403 };
    },
  },
});

mock.module(require.resolve('../lib/supabase/server'), {
  namedExports: { getServerSupabaseClient: async () => ({ kind: 'user-scoped-client' }) },
});

mock.module(require.resolve('../lib/customers/travel-style-repository'), {
  namedExports: {
    listTravelStylesServer: async (client: unknown) => {
      calls.push(client);
      return preferences.travelStyles;
    },
  },
});

mock.module(require.resolve('../lib/customers/hotel-tier-repository'), {
  namedExports: {
    listActiveHotelTiersServer: async (client: unknown) => {
      calls.push(client);
      return preferences.hotelTiers;
    },
  },
});

test('Tour Design client preferences are read through a permissioned BFF route', async (t) => {
  const route = await import('../app/api/tour-design/client-preferences/route');

  await t.beforeEach(() => {
    authenticated = true;
    readAllowed = true;
    calls.length = 0;
  });

  await t.test('returns 401 without a CRM session', async () => {
    authenticated = false;
    const response = await route.GET(new Request('http://localhost/api/tour-design/client-preferences'));
    assert.equal(response.status, 401);
    assert.equal(calls.length, 0);
  });

  await t.test('returns 403 without tour_design.read', async () => {
    readAllowed = false;
    const response = await route.GET(new Request('http://localhost/api/tour-design/client-preferences'));
    assert.equal(response.status, 403);
    assert.equal(calls.length, 0);
  });

  await t.test('returns the shared Travel Style and Hotel Tier catalogs', async () => {
    const response = await route.GET(new Request('http://localhost/api/tour-design/client-preferences'));
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { ok: true, data: preferences });
    assert.deepEqual(calls, [{ kind: 'user-scoped-client' }, { kind: 'user-scoped-client' }]);
  });
});
