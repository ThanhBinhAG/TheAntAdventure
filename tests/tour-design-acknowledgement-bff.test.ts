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
let writeAllowed = true;
let acknowledgement = {
  acknowledged: true,
  lead: { id: 'LD-001', tourDesignAcked: true },
};
const acknowledgementCalls: Array<{ client: unknown; leadId: string }> = [];

mock.module(require.resolve('../lib/auth/session'), {
  namedExports: {
    getAuthContext: async () => ({
      authenticated,
      isSuperAdmin: false,
      isBreakGlass: false,
      userId: authenticated ? 'tour-editor' : null,
      email: authenticated ? 'editor@example.com' : null,
    }),
  },
});

mock.module(require.resolve('../lib/auth/permissions-server'), {
  namedExports: {
    checkPermissionForRequest: async () => {
      if (!authenticated) return { allowed: false, status: 401 };
      return writeAllowed ? { allowed: true } : { allowed: false, status: 403 };
    },
  },
});

mock.module(require.resolve('../lib/supabase/server'), {
  namedExports: {
    getServerSupabaseClient: async () => ({ kind: 'user-scoped-client' }),
  },
});

mock.module(require.resolve('../lib/tour-design/tour-design-repository'), {
  namedExports: {
    acknowledgeTourDesignLeadServer: async (client: unknown, leadId: string) => {
      acknowledgementCalls.push({ client, leadId });
      return acknowledgement;
    },
  },
});

test('Tour Design acknowledgement BFF requires write permission and is idempotent', async (t) => {
  const route = await import('../app/api/tour-design/acknowledgements/route');

  await t.beforeEach(() => {
    authenticated = true;
    writeAllowed = true;
    acknowledgement = {
      acknowledged: true,
      lead: { id: 'LD-001', tourDesignAcked: true },
    };
    acknowledgementCalls.length = 0;
  });

  await t.test('returns 401 without a CRM session', async () => {
    authenticated = false;
    const response = await route.POST(new Request('http://localhost/api/tour-design/acknowledgements', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leadId: 'LD-001' }),
    }));

    assert.equal(response.status, 401);
    assert.equal(acknowledgementCalls.length, 0);
  });

  await t.test('returns 403 without tour_design.write', async () => {
    writeAllowed = false;
    const response = await route.POST(new Request('http://localhost/api/tour-design/acknowledgements', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leadId: 'LD-001' }),
    }));

    assert.equal(response.status, 403);
    assert.equal(acknowledgementCalls.length, 0);
  });

  await t.test('returns 422 before persistence when leadId is missing', async () => {
    const response = await route.POST(new Request('http://localhost/api/tour-design/acknowledgements', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    }));

    assert.equal(response.status, 422);
    assert.equal(acknowledgementCalls.length, 0);
  });

  await t.test('updates the UI only from the server acknowledgement result', async () => {
    acknowledgement = {
      acknowledged: false,
      lead: { id: 'LD-001', tourDesignAcked: true },
    };
    const response = await route.POST(new Request('http://localhost/api/tour-design/acknowledgements', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leadId: 'LD-001' }),
    }));

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { ok: true, data: acknowledgement });
    assert.deepEqual(acknowledgementCalls, [{
      client: { kind: 'user-scoped-client' },
      leadId: 'LD-001',
    }]);
  });
});
