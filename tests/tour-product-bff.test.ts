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
let productAggregateRpcError: { message: string; code?: string } | null = null;
let productDeleteFound = true;

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
          return Promise.resolve({
            error: name === 'replace_product_catalogue_transaction'
              ? productImportRpcError
              : name === 'save_product_aggregate' || name === 'update_product_aggregate'
                ? productAggregateRpcError
                : null,
          });
        },
        from: (table: string) => ({
          select: () => {
            supabaseCalls.push({ method: 'select', table });
            return {
              order: () => Promise.resolve({ data: [], error: null }),
              eq: (field: string, value: string) => ({
                maybeSingle: () => Promise.resolve({
                  data: table === 'products'
                    ? {
                      code: value, name: 'Test Product', logic: '', duration: '', category: '',
                      destination: '', level: '', description: '', usp: '', notes_to_sales: '',
                      price_from: '', region: 'north',
                    }
                    : table === 'product_pricing'
                      ? {
                        product_code: value, std_cost: 0,
                        p1: 0, p2: 0, p3: 0, p4: 0, p5: 0, p6: 0, p7: 0, p8: 0, p9: 0, p10: 0,
                        c1: 0, c2: 0, c3: 0, c4: 0, c5: 0, c6: 0, c7: 0, c8: 0, c9: 0, c10: 0,
                        incl_guide: false, incl_transport: false, incl_tickets: false, incl_water: false, incl_meals: false,
                      }
                      : null,
                  error: null,
                }),
              }),
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
                return {
                  select: () => Promise.resolve({
                    data: productDeleteFound ? [{ code: val }] : [],
                    error: null,
                  }),
                };
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
    productAggregateRpcError = null;
    productDeleteFound = true;
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

    assert.equal(supabaseCalls.length, 1);
    assert.equal(supabaseCalls[0].method, 'rpc');
    assert.equal(supabaseCalls[0].table, 'save_product_aggregate');
    assert.equal(supabaseCalls[0].data.p_pricing_stub.product_code, 'AA-NV-TEST-01');
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

    assert.equal(supabaseCalls.length, 1);
    assert.equal(supabaseCalls[0].method, 'rpc');
    assert.equal(supabaseCalls[0].table, 'update_product_aggregate');
    assert.equal(supabaseCalls[0].data.p_photo_links.length, 2);
    assert.equal(cacheInvalidated, true);
  });

  await t.test('PATCH /api/products - preserves cache state when aggregate transaction fails', async () => {
    productAggregateRpcError = { message: 'photo link insert failed' };
    const req = new Request('http://localhost/api/products', {
      method: 'PATCH',
      body: JSON.stringify({
        product: { code: 'AA-NV-TEST-01', name: 'Failed Product', region: 'north' },
      }),
    });

    const response = await productsRoute.PATCH(req);
    assert.equal(response.status, 500);
    assert.equal(supabaseCalls.length, 1);
    assert.equal(supabaseCalls[0].table, 'update_product_aggregate');
    assert.equal(cacheInvalidated, false);
  });

  await t.test('PATCH /api/products - returns 404 instead of creating a missing product', async () => {
    productAggregateRpcError = { message: 'Product does not exist', code: 'P0002' };
    const response = await productsRoute.PATCH(new Request('http://localhost/api/products', {
      method: 'PATCH',
      body: JSON.stringify({ product: { code: 'MISSING', name: 'Missing Product', region: 'north' } }),
    }));

    assert.equal(response.status, 404);
    assert.equal(cacheInvalidated, false);
    assert.equal(supabaseCalls[0].table, 'update_product_aggregate');
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

  await t.test('DELETE /api/products - returns 404 when no product is deleted', async () => {
    productDeleteFound = false;
    const response = await productsRoute.DELETE(new Request('http://localhost/api/products', {
      method: 'DELETE',
      body: JSON.stringify({ code: 'MISSING' }),
    }));

    assert.equal(response.status, 404);
    assert.equal(cacheInvalidated, false);
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
      code: 'AA-NV-TEST-01',
      name: 'Imported Product',
      desc: 'Imported Description',
      notesToSales: 'Imported Notes',
      dur: 'Full Day',
      cat: 'Adventure',
      dest: 'Hanoi',
      lvl: 'Easy & Comfortable',
      needsReview: false,
      reviewReasons: [],
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

  await t.test('POST /api/products/import rejects malformed portfolio drafts before the transaction', async () => {
    const response = await importRoute.POST(new Request('http://localhost/api/products/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        drafts: [{
          code: 'AA-NV-BAD-01',
          name: 'Bad Product',
          desc: '',
          notesToSales: '',
          dur: 'Full Day',
          cat: 'Adventure',
          dest: 'Hanoi',
          lvl: 'Easy & Comfortable',
          region: 'unknown-region',
          needsReview: 'false',
          reviewReasons: [],
          unexpected: true,
        }],
      }),
    }));

    assert.equal(response.status, 422);
    assert.equal(supabaseCalls.length, 0);
    assert.equal(cacheInvalidated, false);
  });

  await t.test('POST /api/products/import rejects duplicate product codes before the transaction', async () => {
    const response = await importRoute.POST(new Request('http://localhost/api/products/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        drafts: [
          {
            code: 'AA-NV-DUP-01', name: 'First', desc: '', notesToSales: '', dur: 'Full Day',
            cat: 'Adventure', dest: 'Hanoi', region: 'north', lvl: 'Easy & Comfortable',
            needsReview: false, reviewReasons: [],
          },
          {
            code: ' aa-nv-dup-01 ', name: 'Second', desc: '', notesToSales: '', dur: 'Half Day',
            cat: 'Cultural', dest: 'Hanoi', region: 'north', lvl: 'Easy & Comfortable',
            needsReview: false, reviewReasons: [],
          },
        ],
      }),
    }));

    assert.equal(response.status, 422);
    assert.equal(supabaseCalls.length, 0);
    assert.equal(cacheInvalidated, false);
  });

  await t.test('POST /api/products/import - preserves the current catalogue when transaction fails', async () => {
    productImportRpcError = { message: 'pricing insert failed' };
    const req = new Request('http://localhost/api/products/import', {
      method: 'POST',
      body: JSON.stringify({
        drafts: [{
          region: 'north', code: 'AA-NV-FAIL-01', name: 'Failed Import', desc: '', notesToSales: '',
          dur: 'Full Day', cat: 'Adventure', dest: 'Hanoi', lvl: 'Easy & Comfortable',
          needsReview: false, reviewReasons: [],
        }],
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
