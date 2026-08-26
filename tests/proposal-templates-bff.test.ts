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
let permissionResult: { allowed: true } | { allowed: false; status: 401 | 403 } = { allowed: true };
const injectedClients: unknown[] = [];
const savedTemplates: Array<{ client: unknown; variant: string; fields: unknown }> = [];

const templates = {
  b2c: { fields: {}, source: 'system' as const },
  b2b: { fields: {}, source: 'system' as const },
};

mock.module(require.resolve('../lib/auth/session'), {
  namedExports: {
    getAuthContext: async () => ({
      authenticated,
      isSuperAdmin: false,
      isBreakGlass: false,
      userId: authenticated ? 'template-editor' : null,
      email: authenticated ? 'editor@example.com' : null,
    }),
  },
});

mock.module(require.resolve('../lib/auth/permissions-server'), {
  namedExports: {
    checkPermissionForRequest: async () => permissionResult,
  },
});

mock.module(require.resolve('../lib/supabase/server'), {
  namedExports: {
    getServerSupabaseClient: async () => ({ kind: 'user-scoped-client' }),
  },
});

mock.module(require.resolve('../lib/proposals/proposal-company-template-server'), {
  namedExports: {
    fetchCompanyProposalTemplates: async (client: unknown) => {
      injectedClients.push(client);
      return templates;
    },
    upsertCompanyProposalTemplate: async (client: unknown, variant: string, fields: unknown) => {
      savedTemplates.push({ client, variant, fields });
      return templates;
    },
  },
});

test('Company proposal template BFF protects reads and writes with Tour Design permissions', async (t) => {
  const route = await import('../app/api/proposals/templates/route');

  await t.beforeEach(() => {
    authenticated = true;
    permissionResult = { allowed: true };
    injectedClients.length = 0;
    savedTemplates.length = 0;
  });

  await t.test('returns 401 when no CRM session is available', async () => {
    authenticated = false;
    permissionResult = { allowed: false, status: 401 };

    const response = await route.PUT(new Request('http://localhost/api/proposals/templates', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ variant: 'b2c', fields: {} }),
    }));

    assert.equal(response.status, 401);
    assert.equal(savedTemplates.length, 0);
  });

  await t.test('returns 403 and does not write when tour_design.write is absent', async () => {
    permissionResult = { allowed: false, status: 403 };

    const response = await route.PUT(new Request('http://localhost/api/proposals/templates', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ variant: 'b2b', fields: {} }),
    }));

    assert.equal(response.status, 403);
    assert.equal(savedTemplates.length, 0);
  });

  await t.test('returns 403 and does not read when tour_design.read is absent', async () => {
    permissionResult = { allowed: false, status: 403 };

    const response = await route.GET(new Request('http://localhost/api/proposals/templates'));

    assert.equal(response.status, 403);
    assert.equal(injectedClients.length, 0);
  });

  await t.test('returns 422 before persistence when template fields are invalid', async () => {
    const response = await route.PUT(new Request('http://localhost/api/proposals/templates', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ variant: 'b2c', fields: { unexpected: 'field' } }),
    }));

    assert.equal(response.status, 422);
    assert.equal(savedTemplates.length, 0);
  });

  await t.test('uses the BFF-injected user-scoped client for an authorized write', async () => {
    const response = await route.PUT(new Request('http://localhost/api/proposals/templates', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        variant: 'b2c',
        fields: { tagline: 'A private journey through Vietnam.' },
      }),
    }));

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { ok: true, data: templates });
    assert.deepEqual(savedTemplates, [{
      client: { kind: 'user-scoped-client' },
      variant: 'b2c',
      fields: { tagline: 'A private journey through Vietnam.' },
    }]);
  });
});
