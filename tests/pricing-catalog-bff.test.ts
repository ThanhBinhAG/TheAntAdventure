import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import test, { mock } from 'node:test';

const require = createRequire(import.meta.url);
const serverOnlyPath = require.resolve('server-only');
require.cache[serverOnlyPath] = {
  id: serverOnlyPath,
  filename: serverOnlyPath,
  loaded: true,
  exports: {},
} as NodeModule;

let allowed = true;
let requestedPermissions: string[] = [];
let calls: Array<{ method: string; table: string; data?: unknown; column?: string; value?: string }> = [];

mock.module(require.resolve('../lib/auth/session'), {
  namedExports: {
    getAuthContext: async () => ({
      authenticated: true,
      isSuperAdmin: false,
      isBreakGlass: false,
      userId: 'pricing-test-user',
      email: 'pricing@example.test',
    }),
  },
});

mock.module(require.resolve('../lib/auth/permissions-server'), {
  namedExports: {
    checkPermissionForRequest: async (permission: string) => {
      requestedPermissions.push(permission);
      return allowed ? { allowed: true } : { allowed: false, status: 403 };
    },
  },
});

function selectBuilder(table: string) {
  const builder = {
    order: () => {
      calls.push({ method: 'select', table });
      return builder;
    },
    range: () => builder,
    eq: (column: string, value: string) => {
      calls.push({ method: 'filter', table, column, value });
      return builder;
    },
    limit: () => Promise.resolve({ data: [], error: null }),
    then: (resolve: (value: { data: unknown[]; error: null }) => unknown) =>
      Promise.resolve({ data: [], error: null }).then(resolve),
  };
  return builder;
}

mock.module(require.resolve('../lib/supabase/server'), {
  namedExports: {
    getServerSupabaseClient: async () => ({
      from: (table: string) => ({
        select: () => selectBuilder(table),
        update: (data: unknown) => ({
          eq: (column: string, value: string) => {
            calls.push({ method: 'update', table, data, column, value });
            return Promise.resolve({ error: null });
          },
        }),
        insert: (data: unknown) => {
          calls.push({ method: 'insert', table, data });
          return Promise.resolve({ error: null });
        },
        delete: () => ({
          eq: (column: string, value: string) => {
            calls.push({ method: 'delete', table, column, value });
            return Promise.resolve({ error: null });
          },
          neq: (column: string, value: string) => {
            calls.push({ method: 'delete', table, column, value });
            return Promise.resolve({ error: null });
          },
        }),
      }),
    }),
  },
});

function source(path: string): string {
  return readFileSync(join(process.cwd(), path), 'utf8');
}

test('Pricing catalog BFF keeps browser reads and writes on CRM routes', async (t) => {
  const essentials = await import('../app/api/pricing/essentials/route');
  const accommodation = await import('../app/api/pricing/accommodation/route');

  await t.beforeEach(() => {
    allowed = true;
    requestedPermissions = [];
    calls = [];
  });

  await t.test('GET essentials requires its page permission and loads through the server client', async () => {
    const response = await essentials.GET(new Request('http://localhost/api/pricing/essentials'));

    assert.equal(response.status, 200);
    assert.deepEqual(requestedPermissions, ['pricing_essentials.read']);
    assert.ok(calls.some((call) => call.method === 'select' && call.table === 'pricing_ess_products'));
    const body = await response.json();
    assert.equal(body.ok, true);
    assert.deepEqual(body.data.catalog.products, []);
  });

  await t.test('PATCH accommodation maps app fields on the server and requires write permission', async () => {
    const response = await accommodation.PATCH(
      new Request('http://localhost/api/pricing/accommodation', {
        method: 'PATCH',
        body: JSON.stringify({
          table: 'roomRates',
          id: 'rate-1',
          patch: { propertyName: 'Updated hotel' },
        }),
      }),
    );

    assert.equal(response.status, 200);
    assert.deepEqual(requestedPermissions, ['pricing_accommodation.write']);
    const update = calls.find((call) => call.method === 'update');
    assert.equal(update?.table, 'pricing_acc_room_rates');
    assert.equal(update?.column, 'id');
    assert.equal(update?.value, 'rate-1');
    assert.equal((update?.data as { property_name?: unknown }).property_name, 'Updated hotel');
    assert.equal(typeof (update?.data as { updated_at?: unknown }).updated_at, 'string');
  });

  await t.test('POST essentials rejects invalid imports and persists a valid replacement through CRM', async () => {
    const badResponse = await essentials.POST(
      new Request('http://localhost/api/pricing/essentials', {
        method: 'POST',
        body: JSON.stringify({ catalog: {} }),
      }),
    );
    assert.equal(badResponse.status, 422);

    const response = await essentials.POST(
      new Request('http://localhost/api/pricing/essentials', {
        method: 'POST',
        body: JSON.stringify({
          catalog: {
            settings: [],
            products: [],
            costLines: [],
            services: [],
            cars: [],
            hotels: [],
            notes: [],
          },
          meta: { fileName: 'essentials.xlsx', sheetCount: 1, warningCount: 0 },
        }),
      }),
    );

    assert.equal(response.status, 200);
    assert.ok(calls.some((call) => call.method === 'insert' && call.table === 'pricing_catalog_imports'));
  });

  await t.test('forbidden users cannot read the catalog', async () => {
    allowed = false;
    const response = await essentials.GET(new Request('http://localhost/api/pricing/essentials'));
    assert.equal(response.status, 403);
  });
});

test('Pricing client code has no direct Supabase catalog dependency', () => {
  for (const path of [
    'hooks/usePricingCatalog.ts',
    'components/pricing/CatalogImportModal.tsx',
    'components/pages/PricingEssentials.tsx',
    'components/pages/PricingAccommodation.tsx',
  ]) {
    assert.doesNotMatch(source(path), /catalog-db/);
  }

  assert.match(source('lib/pricing/catalog-db.ts'), /import 'server-only'/);
});
