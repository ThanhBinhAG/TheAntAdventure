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
let tourSaveRpcError: { message: string; code?: string; details?: string } | null = null;
let tourSaveRpcResult: number | null = 1;

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
        requiredPermission === 'tour_design.read' ||
        requiredPermission === 'tour_design.write'
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
          return Promise.resolve({ data: tourSaveRpcResult, error: tourSaveRpcError });
        },
        from: (table: string) => ({
          select: () => {
            supabaseCalls.push({ method: 'select', table });
            if (table === 'tour_drafts') {
              return Promise.resolve({
                data: [
                  {
                    id: 'TD-001',
                    lead_id: 'L-001',
                    cust_id: 'C-001',
                    outline_status: 'draft',
                    brief_json: { notes: 'Sample notes' },
                  },
                ],
                error: null,
              });
            }
            if (table === 'tour_outline_days') {
              return {
                order: () => Promise.resolve({
                  data: [
                    {
                      id: 'TOD-001',
                      draft_id: 'TD-001',
                      day_number: 1,
                      outline_date: '2026-08-20',
                      location: 'Hanoi',
                      activities: 'Visiting temples',
                      hotels: 'Hotel 1',
                      sort_order: 1,
                    },
                  ],
                  error: null,
                }),
              };
            }
            return Promise.resolve({ data: [], error: null });
          },
          upsert: (data: any) => {
            supabaseCalls.push({ method: 'upsert', table, data });
            return Promise.resolve({ error: null });
          },
          insert: (data: any) => {
            supabaseCalls.push({ method: 'insert', table, data });
            return Promise.resolve({ error: null });
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

test('Tour Design BFF APIs - Tests', async (t) => {
  // Import route handlers dynamically to ensure mocks are in place
  const saveRoute = await import('../app/api/tour-design/save/route');
  const draftsAllRoute = await import('../app/api/tour-design/drafts/all/route');
  const outlinesAllRoute = await import('../app/api/tour-design/outlines/all/route');

  await t.beforeEach(() => {
    supabaseCalls = [];
    tourSaveRpcError = null;
    tourSaveRpcResult = 1;
  });

  await t.test('GET /api/tour-design/drafts/all - lists all drafts with mapping', async () => {
    const req = new Request('http://localhost/api/tour-design/drafts/all');
    const response = await draftsAllRoute.GET(req);
    assert.equal(response.status, 200);

    const json = await response.json();
    assert.equal(json.ok, true);
    assert.equal(Array.isArray(json.data), true);
    assert.equal(json.data.length, 1);

    // Verify mapping rowToTourDraft: lead_id -> leadId
    const draft = json.data[0];
    assert.equal(draft.id, 'TD-001');
    assert.equal(draft.leadId, 'L-001');
    assert.equal(draft.custId, 'C-001');

    assert.equal(supabaseCalls.length, 1);
    assert.equal(supabaseCalls[0].method, 'select');
    assert.equal(supabaseCalls[0].table, 'tour_drafts');
  });

  await t.test('GET /api/tour-design/outlines/all - lists all outline days with mapping', async () => {
    const req = new Request('http://localhost/api/tour-design/outlines/all');
    const response = await outlinesAllRoute.GET(req);
    assert.equal(response.status, 200);

    const json = await response.json();
    assert.equal(json.ok, true);
    assert.equal(Array.isArray(json.data), true);
    assert.equal(json.data.length, 1);

    // Verify mapping rowToTourOutlineDay: outline_date -> date
    const outline = json.data[0];
    assert.equal(outline.id, 'TOD-001');
    assert.equal(outline.draftId, 'TD-001');
    assert.equal(outline.date, '2026-08-20');

    assert.equal(supabaseCalls.length, 1);
    assert.equal(supabaseCalls[0].method, 'select');
    assert.equal(supabaseCalls[0].table, 'tour_outline_days');
  });

  await t.test('POST /api/tour-design/save - upserts draft and replaces outlines safely', async () => {
    const newDraft = {
      id: 'TD-002',
      leadId: 'L-002',
      custId: 'C-002',
      outlineStatus: 'approved' as const,
      clientType: 'b2b' as const,
    };

    const newOutlines = [
      {
        id: 'TOD-002',
        draftId: 'TD-002',
        dayNumber: 1,
        date: '2026-08-21',
        location: 'Saigon',
      },
    ];

    const req = new Request('http://localhost/api/tour-design/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ draft: newDraft, outlineDays: newOutlines, expectedSaveRevision: 0 }),
    });

    const response = await saveRoute.POST(req);
    assert.equal(response.status, 200);

    const json = await response.json();
    assert.equal(json.ok, true);
    assert.equal(json.data.saveRevision, 1);

    assert.equal(supabaseCalls.length, 1);
    assert.equal(supabaseCalls[0].method, 'rpc');
    assert.equal(supabaseCalls[0].table, 'save_tour_design_versioned_transaction');
    assert.equal(supabaseCalls[0].data.p_draft.id, 'TD-002');
    assert.equal(supabaseCalls[0].data.p_draft.lead_id, 'L-002');
    assert.equal(supabaseCalls[0].data.p_outline_days[0].id, 'TOD-002');
    assert.equal(supabaseCalls[0].data.p_outline_days[0].outline_date, '2026-08-21');
    assert.equal(supabaseCalls[0].data.p_expected_save_revision, 0);
  });

  await t.test('POST /api/tour-design/save fails atomically when the transaction rejects', async () => {
    tourSaveRpcError = { message: 'outline insert failed' };
    const req = new Request('http://localhost/api/tour-design/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        draft: { id: 'TD-003', leadId: 'L-003', custId: 'C-003' },
        outlineDays: [],
        expectedSaveRevision: 0,
      }),
    });

    const response = await saveRoute.POST(req);
    assert.equal(response.status, 500);
    assert.equal(supabaseCalls.length, 1);
    assert.equal(supabaseCalls[0].method, 'rpc');
  });

  await t.test('POST /api/tour-design/save returns 409 when an older revision arrives late', async () => {
    tourSaveRpcError = {
      message: 'Tour draft was modified by a newer save',
      code: 'P0001',
      details: 'current_save_revision=2',
    };
    const req = new Request('http://localhost/api/tour-design/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        draft: { id: 'TD-004', leadId: 'L-004', custId: 'C-004' },
        outlineDays: [],
        expectedSaveRevision: 1,
      }),
    });

    const response = await saveRoute.POST(req);
    assert.equal(response.status, 409);
    const json = await response.json();
    assert.equal(json.ok, false);
    assert.equal(json.currentSaveRevision, 2);
  });

  await t.test('POST /api/tour-design/save rejects an outline status unsupported by the database', async () => {
    const response = await saveRoute.POST(new Request('http://localhost/api/tour-design/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        draft: { id: 'TD-INVALID', leadId: 'L-004', custId: 'C-004', outlineStatus: 'revision' },
        outlineDays: [],
        expectedSaveRevision: 0,
      }),
    }));

    assert.equal(response.status, 422);
    assert.equal(supabaseCalls.length, 0);
  });
});
