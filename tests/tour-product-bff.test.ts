import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test, { mock } from 'node:test';

// Bypass server-only warning in tests
const require = createRequire(import.meta.url);
const serverOnlyPath = require.resolve('server-only');
require.cache[serverOnlyPath] = {
  id: serverOnlyPath,
  filename: serverOnlyPath,
  loaded: true,
  exports: {},
} as NodeModule;

// State mocks to verify database calls
let supabaseCalls: { method: string; table: string; data?: any; eqCode?: string }[] = [];
let cacheInvalidated = false;
let productImportRpcError: { message: string } | null = null;

// Mock dependencies
mock.module(require.resolve('../lib/auth/session'), {
  namedExports: {
    getAuthContext: async () => ({
      authenticated: true,
      isSuperAdmin: false,
      isBreakGlass: false,
      userId: 'test-user-id',
      email: 'user@example.com',
    }),
  },
});

mock.module(require.resolve('../lib/auth/permissions-server'), {
  namedExports: {
    checkPermissionForRequest: async (requiredPermission: string) => {
      // Cho phép products.read, products.write, pricing.write
      if (
        requiredPermission === 'products.read' ||
        requiredPermission === 'products.write' ||
        requiredPermission === 'pricing.write'
      ) {
        return { allowed: true };
      }
      return { allowed: false, status: 403 };
    },
  },
});

mock.module(require.resolve('../lib/supabase/server'), {
  namedExports: {
    getServerSupabaseClient: async () => {
      return {
        rpc: (name: string, data: any) => {
          supabaseCalls.push({ method: 'rpc', table: name, data });
          return Promise.resolve({ error: name === 'replace_product_catalogue_transaction' ? productImportRpcError : null });
        },
        from: (table: string) => ({
          select: () => {
            supabaseCalls.push({ method: 'select', table });
            return {
              order: () => Promise.resolve({ data: [], error: null }),
            };
          },
          insert: (data: any) => {
            supabaseCalls.push({ method: 'insert', table, data });
            return Promise.resolve({ error: null });
          },
          update: (data: any) => {
            return {
              eq: (field: string, val: string) => {
                supabaseCalls.push({ method: 'update', table, data, eqCode: val });
                return Promise.resolve({ error: null });
              },
            };
          },
          delete: () => {
            return {
              neq: (field: string, val: string) => {
                supabaseCalls.push({ method: 'delete_all', table, eqCode: val });
                return Promise.resolve({ error: null });
              },
              eq: (field: string, val: string) => {
                supabaseCalls.push({ method: 'delete', table, eqCode: val });
                return Promise.resolve({ error: null });
              },
            };
          },
          upsert: (data: any) => {
            supabaseCalls.push({ method: 'insert', table, data });
            return Promise.resolve({ error: null });
          },
        }),
      } as any;
    },
  },
});

mock.module(require.resolve('../lib/redis/product-facets'), {
  namedExports: {
    invalidateProductFacetsCache: async () => {
      cacheInvalidated = true;
    },
  },
});

mock.module(require.resolve('../lib/products/product-list-server'), {
  namedExports: {
    listProductsPage: async (input: any) => {
      return {
        items: [],
        page: input.page,
        pageSize: input.pageSize,
        totalCount: 0,
        totalPages: 0,
        hasPreviousPage: false,
        hasNextPage: false,
      };
    },
  },
});

test('Tour Product BFF APIs - Tests', async (t) => {
  // Import route handlers dynamically to ensure mocks are in place
  const productsRoute = await import('../app/api/products/route');
  const productsAllRoute = await import('../app/api/products/all/route');
  const pricingAllRoute = await import('../app/api/products/pricing/all/route');
  const pricingRoute = await import('../app/api/products/pricing/route');
  const importRoute = await import('../app/api/products/import/route');

  await t.beforeEach(() => {
    supabaseCalls = [];
    cacheInvalidated = false;
    productImportRpcError = null;
  });

  await t.test('GET /api/products - paginated page', async () => {
    const req = new Request('http://localhost/api/products?page=1&pageSize=12');
    const response = await productsRoute.GET(req);
    assert.equal(response.status, 200);
    const json = await response.json();
    assert.equal(json.ok, true);
    assert.equal(json.page, 1);
    assert.equal(json.pageSize, 12);
  });

  await t.test('POST /api/products - creates a product and default pricing stub', async () => {
    const newProduct = {
      code: 'AA-NV-TEST-01',
      name: 'Test Product',
      logic: 'Some logic',
      dur: '1 day',
      cat: 'Adventure',
      dest: 'Ha Noi',
      lvl: 'Easy',
      desc: 'Test description',
      usp: 'Awesome highlights',
      price: '100',
      region: 'north',
      status: 'active' as const,
    };

    const req = new Request('http://localhost/api/products', {
      method: 'POST',
      body: JSON.stringify({ product: newProduct }),
    });

    const response = await productsRoute.POST(req);
    assert.equal(response.status, 200);
    const json = await response.json();
    assert.equal(json.ok, true);

    // Verify repository inserted product, pricing stub, and linked photos
    const inserts = supabaseCalls.filter((c) => c.method === 'insert');
    assert.equal(inserts.length, 2); // 1 for products, 1 for product_pricing (photos empty)
    assert.equal(inserts[0].table, 'products');
    assert.equal(inserts[1].table, 'product_pricing');
    assert.equal(inserts[1].data.product_code, 'AA-NV-TEST-01');
    assert.equal(cacheInvalidated, true);
  });

  await t.test('PATCH /api/products - updates product info and photos', async () => {
    const editProduct = {
      code: 'AA-NV-TEST-01',
      name: 'Updated Product Name',
      logic: 'Some logic',
      dur: '1 day',
      cat: 'Adventure',
      dest: 'Ha Noi',
      lvl: 'Easy',
      desc: 'Test description',
      usp: 'Awesome highlights',
      price: '100',
      region: 'north',
      status: 'active' as const,
      photoIds: ['PH-001'],
      linkedPhotoIds: ['PH-001', 'PH-002'],
    };

    const req = new Request('http://localhost/api/products', {
      method: 'PATCH',
      body: JSON.stringify({ product: editProduct }),
    });

    const response = await productsRoute.PATCH(req);
    assert.equal(response.status, 200);
    const json = await response.json();
    assert.equal(json.ok, true);

    // Verify base product update
    const updates = supabaseCalls.filter((c) => c.method === 'update');
    assert.equal(updates.length, 1);
    assert.equal(updates[0].table, 'products');
    assert.equal(updates[0].eqCode, 'AA-NV-TEST-01');

    // Verify photo links deletes and re-inserts
    const deletes = supabaseCalls.filter((c) => c.method === 'delete');
    assert.equal(deletes.length, 1);
    assert.equal(deletes[0].table, 'product_photos');
    assert.equal(deletes[0].eqCode, 'AA-NV-TEST-01');

    const inserts = supabaseCalls.filter((c) => c.method === 'insert');
    assert.equal(inserts.length, 1);
    assert.equal(inserts[0].table, 'product_photos');
    assert.equal(cacheInvalidated, true);
  });

  await t.test('DELETE /api/products - deletes a product', async () => {
    const req = new Request('http://localhost/api/products', {
      method: 'DELETE',
      body: JSON.stringify({ code: 'AA-NV-TEST-01' }),
    });

    const response = await productsRoute.DELETE(req);
    assert.equal(response.status, 200);
    const json = await response.json();
    assert.equal(json.ok, true);

    const deletes = supabaseCalls.filter((c) => c.method === 'delete');
    assert.equal(deletes.length, 1);
    assert.equal(deletes[0].table, 'products');
    assert.equal(deletes[0].eqCode, 'AA-NV-TEST-01');
    assert.equal(cacheInvalidated, true);
  });

  await t.test('GET /api/products/all - full hydration products', async () => {
    const req = new Request('http://localhost/api/products/all');
    const response = await productsAllRoute.GET(req);
    assert.equal(response.status, 200);
    const json = await response.json();
    assert.equal(json.ok, true);

    const selects = supabaseCalls.filter((c) => c.method === 'select');
    assert.equal(selects.length, 2); // products and product_photos
    assert.equal(selects[0].table, 'products');
    assert.equal(selects[1].table, 'product_photos');
  });

  await t.test('GET /api/products/pricing/all - full hydration product pricing', async () => {
    const req = new Request('http://localhost/api/products/pricing/all');
    const response = await pricingAllRoute.GET(req);
    assert.equal(response.status, 200);
    const json = await response.json();
    assert.equal(json.ok, true);

    const selects = supabaseCalls.filter((c) => c.method === 'select');
    assert.equal(selects.length, 1);
    assert.equal(selects[0].table, 'product_pricing');
  });

  await t.test('PATCH /api/products/pricing - updates pricing tiers', async () => {
    const editPricing = {
      productCode: 'AA-NV-TEST-01',
      stdCost: 50,
      p1: 100, p2: 95, p3: 90, p4: 85, p5: 80, p6: 75, p7: 70, p8: 65, p9: 60, p10: 55,
      c1: 45, c2: 45, c3: 45, c4: 45, c5: 45, c6: 45, c7: 45, c8: 45, c9: 45, c10: 45,
      incl: { g: true, tr: true, tk: false, w: true, m: false },
    };

    const req = new Request('http://localhost/api/products/pricing', {
      method: 'PATCH',
      body: JSON.stringify({ pricing: editPricing }),
    });

    const response = await pricingRoute.PATCH(req);
    assert.equal(response.status, 200);
    const json = await response.json();
    assert.equal(json.ok, true);

    const inserts = supabaseCalls.filter((c) => c.method === 'insert');
    assert.equal(inserts.length, 1);
    assert.equal(inserts[0].table, 'product_pricing');
    assert.equal(inserts[0].data.std_cost, 50);
    assert.equal(inserts[0].data.incl_guide, true);
    assert.equal(cacheInvalidated, true);
  });

  await t.test('POST /api/products/import - replaces full catalog through one transaction', async () => {
    const draft = {
      region: 'north',
      duration: '1 day',
      category: 'Adventure',
      code: 'AA-NV-TEST-01',
      name: 'Imported Product',
      desc: 'Imported Description',
      notesToSales: 'Imported Notes',
    };

    const req = new Request('http://localhost/api/products/import', {
      method: 'POST',
      body: JSON.stringify({ drafts: [draft] }),
    });

    const response = await importRoute.POST(req);
    assert.equal(response.status, 200);
    const json = await response.json();
    assert.equal(json.ok, true);

    assert.equal(supabaseCalls.length, 1);
    assert.equal(supabaseCalls[0].method, 'rpc');
    assert.equal(supabaseCalls[0].table, 'replace_product_catalogue_transaction');
    assert.equal(
      supabaseCalls[0].data.p_products.some((product: { code: string }) => product.code === 'AA-NV-TEST-01'),
      true
    );
    assert.equal(
      supabaseCalls[0].data.p_pricing_stubs.some((pricing: { product_code: string }) => pricing.product_code === 'AA-NV-TEST-01'),
      true
    );
    assert.equal(cacheInvalidated, true);
  });

  await t.test('POST /api/products/import - preserves the current catalogue when transaction fails', async () => {
    productImportRpcError = { message: 'pricing insert failed' };
    const req = new Request('http://localhost/api/products/import', {
      method: 'POST',
      body: JSON.stringify({
        drafts: [{ region: 'north', duration: '1 day', category: 'Adventure', code: 'AA-NV-FAIL-01', name: 'Failed Import' }],
      }),
    });

    const response = await importRoute.POST(req);
    assert.equal(response.status, 500);
    assert.equal(supabaseCalls.length, 1);
    assert.equal(supabaseCalls[0].method, 'rpc');
    assert.equal(supabaseCalls[0].table, 'replace_product_catalogue_transaction');
    assert.equal(cacheInvalidated, false);
  });
});
