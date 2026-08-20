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
      if (
        requiredPermission === 'attractions.read' ||
        requiredPermission === 'attractions.write'
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
        from: (table: string) => ({
          select: () => {
            supabaseCalls.push({ method: 'select', table });
            if (table === 'attractions') {
              return {
                order: () => Promise.resolve({
                  data: [
                    {
                      id: 'ATT-001',
                      region: 'north',
                      type: 'museum',
                      name: 'Ethnology Museum',
                      dest: 'Hanoi',
                      hours: '08:30-17:30',
                      closed: 'Monday',
                      admission: '40,000 VND',
                      duration: 90,
                      best_time: 'Morning',
                      crowd: 'Light',
                      book_req: false,
                      seasonal: 'None',
                      notes: 'Some notes',
                      alert: 'None',
                      phone: '+84',
                    },
                  ],
                  error: null,
                }),
              };
            }
            if (table === 'attraction_photos') {
              return Promise.resolve({
                data: [
                  {
                    attraction_id: 'ATT-001',
                    photo_id: 'photo-001',
                    sort_order: 0,
                    is_featured: true,
                  },
                ],
                error: null,
              });
            }
            return Promise.resolve({ data: [], error: null });
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
              eq: (field: string, val: string) => {
                supabaseCalls.push({ method: 'delete', table, eqCode: val });
                return Promise.resolve({ error: null });
              },
            };
          },
        }),
      } as any;
    },
  },
});

test('Attractions BFF APIs - Tests', async (t) => {
  // Import route handlers dynamically to ensure mocks are in place
  const attractionsRoute = await import('../app/api/attractions/route');
  const attractionsAllRoute = await import('../app/api/attractions/all/route');

  await t.beforeEach(() => {
    supabaseCalls = [];
  });

  await t.test('GET /api/attractions/all - lists all attractions with assembled photos', async () => {
    const req = new Request('http://localhost/api/attractions/all');
    const response = await attractionsAllRoute.GET(req);
    assert.equal(response.status, 200);

    const json = await response.json();
    assert.equal(json.ok, true);
    assert.equal(Array.isArray(json.data), true);
    assert.equal(json.data.length, 1);

    // Verify assembly: photoIds and linkedPhotoIds resolved from linkRows
    const att = json.data[0];
    assert.equal(att.id, 'ATT-001');
    assert.equal(att.name, 'Ethnology Museum');
    assert.deepEqual(att.photoIds, ['photo-001']);
    assert.deepEqual(att.linkedPhotoIds, ['photo-001']);

    assert.equal(supabaseCalls.length, 2);
    assert.equal(supabaseCalls[0].method, 'select');
    assert.equal(supabaseCalls[0].table, 'attractions');
    assert.equal(supabaseCalls[1].method, 'select');
    assert.equal(supabaseCalls[1].table, 'attraction_photos');
  });

  await t.test('POST /api/attractions - creates a new attraction and photo links', async () => {
    const newAtt = {
      id: 'ATT-002',
      region: 'south' as const,
      type: 'nature',
      name: 'Mekong Delta',
      dest: 'Ben Tre',
      hours: '07:00-18:00',
      closed: 'None',
      admission: 'Free',
      duration: 120,
      best_time: 'Morning',
      crowd: 'Moderate',
      book_req: false,
      seasonal: 'Flooding season',
      notes: 'Beautiful canals',
      alert: 'Wear sunscreen',
      phone: '',
      photoIds: ['photo-002'],
      linkedPhotoIds: ['photo-002'],
    };

    const req = new Request('http://localhost/api/attractions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ attraction: newAtt }),
    });

    const response = await attractionsRoute.POST(req);
    assert.equal(response.status, 200);

    const json = await response.json();
    assert.equal(json.ok, true);
    assert.equal(json.data.id, 'ATT-002');

    // 1 select (to check exist or not inside helper seeds maybe, but here we do base insert + photo insert)
    assert.equal(supabaseCalls.length, 2);
    assert.equal(supabaseCalls[0].method, 'insert');
    assert.equal(supabaseCalls[0].table, 'attractions');
    assert.equal(supabaseCalls[1].method, 'insert');
    assert.equal(supabaseCalls[1].table, 'attraction_photos');

    // Verify junction rows data
    const insertedJunctions = supabaseCalls[1].data;
    assert.equal(insertedJunctions.length, 1);
    assert.equal(insertedJunctions[0].attraction_id, 'ATT-002');
    assert.equal(insertedJunctions[0].photo_id, 'photo-002');
    assert.equal(insertedJunctions[0].is_featured, true);
  });

  await t.test('PATCH /api/attractions - updates an existing attraction and photo links', async () => {
    const updatedAtt = {
      id: 'ATT-001',
      region: 'north' as const,
      type: 'museum',
      name: 'Ethnology Museum Updated',
      dest: 'Hanoi',
      hours: '08:30-17:30',
      closed: 'Monday',
      admission: '40,000 VND',
      duration: 90,
      best_time: 'Morning',
      crowd: 'Light',
      book_req: false,
      seasonal: 'None',
      notes: 'Some notes updated',
      alert: 'None',
      phone: '+84',
      photoIds: ['photo-003'],
      linkedPhotoIds: ['photo-003'],
    };

    const req = new Request('http://localhost/api/attractions', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ attraction: updatedAtt }),
    });

    const response = await attractionsRoute.PATCH(req);
    assert.equal(response.status, 200);

    const json = await response.json();
    assert.equal(json.ok, true);

    assert.equal(supabaseCalls.length, 3);
    assert.equal(supabaseCalls[0].method, 'update');
    assert.equal(supabaseCalls[0].table, 'attractions');
    assert.equal(supabaseCalls[0].eqCode, 'ATT-001');

    assert.equal(supabaseCalls[1].method, 'delete');
    assert.equal(supabaseCalls[1].table, 'attraction_photos');
    assert.equal(supabaseCalls[1].eqCode, 'ATT-001');

    assert.equal(supabaseCalls[2].method, 'insert');
    assert.equal(supabaseCalls[2].table, 'attraction_photos');
  });

  await t.test('DELETE /api/attractions - deletes an existing attraction', async () => {
    const req = new Request('http://localhost/api/attractions', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'ATT-001' }),
    });

    const response = await attractionsRoute.DELETE(req);
    assert.equal(response.status, 200);

    const json = await response.json();
    assert.equal(json.ok, true);

    assert.equal(supabaseCalls.length, 1);
    assert.equal(supabaseCalls[0].method, 'delete');
    assert.equal(supabaseCalls[0].table, 'attractions');
    assert.equal(supabaseCalls[0].eqCode, 'ATT-001');
  });
});
