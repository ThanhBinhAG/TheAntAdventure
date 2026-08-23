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
let plannerUpdateResult: { data: { id: string }[] | null; error: { message: string } | null };
let plannerDeleteResult: { data: { id: string }[] | null; error: { message: string } | null };

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
        requiredPermission === 'planner.read' ||
        requiredPermission === 'planner.write'
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
            return {
              order: () => Promise.resolve({
                data: [
                  {
                    id: 'TK-001',
                    title: 'Sample Task',
                    assignee: 'Tai Pham',
                    due_date: '2026-08-19',
                    priority: 'medium',
                    department: 'Sales',
                    status: 'todo',
                    notes: 'Task notes',
                  },
                ],
                error: null,
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
                return {
                  select: () => Promise.resolve(plannerUpdateResult),
                };
              },
            };
          },
          delete: () => {
            return {
              eq: (field: string, val: string) => {
                supabaseCalls.push({ method: 'delete', table, eqCode: val });
                return {
                  select: () => Promise.resolve(plannerDeleteResult),
                };
              },
            };
          },
        }),
      } as any;
    },
  },
});

test('Daily Planner BFF APIs - Tests', async (t) => {
  // Import route handlers dynamically to ensure mocks are in place
  const plannerRoute = await import('../app/api/planner/route');
  const plannerAllRoute = await import('../app/api/planner/all/route');

  await t.beforeEach(() => {
    supabaseCalls = [];
    plannerUpdateResult = { data: [{ id: 'TK-001' }], error: null };
    plannerDeleteResult = { data: [{ id: 'TK-001' }], error: null };
  });

  await t.test('GET /api/planner/all - lists all tasks with mapping', async () => {
    const req = new Request('http://localhost/api/planner/all');
    const response = await plannerAllRoute.GET(req);
    assert.equal(response.status, 200);

    const json = await response.json();
    assert.equal(json.ok, true);
    assert.equal(Array.isArray(json.data), true);
    assert.equal(json.data.length, 1);

    // Verify mapping rowToTask: due_date -> date, department -> dept
    const task = json.data[0];
    assert.equal(task.id, 'TK-001');
    assert.equal(task.title, 'Sample Task');
    assert.equal(task.date, '2026-08-19');
    assert.equal(task.dept, 'Sales');

    assert.equal(supabaseCalls.length, 1);
    assert.equal(supabaseCalls[0].method, 'select');
    assert.equal(supabaseCalls[0].table, 'tasks');
  });

  await t.test('POST /api/planner - creates a new task', async () => {
    const newTask = {
      id: 'TK-002',
      title: 'New Task Title',
      assignee: 'Linh N.',
      date: '2026-08-20',
      priority: 'high' as const,
      dept: 'Marketing',
      status: 'inprogress' as const,
      notes: 'New notes',
    };

    const req = new Request('http://localhost/api/planner', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ task: newTask }),
    });

    const response = await plannerRoute.POST(req);
    assert.equal(response.status, 200);

    const json = await response.json();
    assert.equal(json.ok, true);
    assert.equal(json.data.id, 'TK-002');

    assert.equal(supabaseCalls.length, 1);
    assert.equal(supabaseCalls[0].method, 'insert');
    assert.equal(supabaseCalls[0].table, 'tasks');
    // Verify mapped data taskToRow: date -> due_date, dept -> department
    const insertedRow = supabaseCalls[0].data;
    assert.equal(insertedRow.id, 'TK-002');
    assert.equal(insertedRow.due_date, '2026-08-20');
    assert.equal(insertedRow.department, 'Marketing');
  });

  await t.test('PATCH /api/planner - updates an existing task', async () => {
    const patchData = {
      status: 'done' as const,
      priority: 'low' as const,
    };

    const req = new Request('http://localhost/api/planner', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'TK-001', patch: patchData }),
    });

    const response = await plannerRoute.PATCH(req);
    assert.equal(response.status, 200);

    const json = await response.json();
    assert.equal(json.ok, true);

    assert.equal(supabaseCalls.length, 1);
    assert.equal(supabaseCalls[0].method, 'update');
    assert.equal(supabaseCalls[0].table, 'tasks');
    assert.equal(supabaseCalls[0].eqCode, 'TK-001');
    assert.equal(supabaseCalls[0].data.status, 'done');
    assert.equal(supabaseCalls[0].data.priority, 'low');
  });

  await t.test('DELETE /api/planner - deletes an existing task', async () => {
    const req = new Request('http://localhost/api/planner', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'TK-001' }),
    });

    const response = await plannerRoute.DELETE(req);
    assert.equal(response.status, 200);

    const json = await response.json();
    assert.equal(json.ok, true);

    assert.equal(supabaseCalls.length, 1);
    assert.equal(supabaseCalls[0].method, 'delete');
    assert.equal(supabaseCalls[0].table, 'tasks');
    assert.equal(supabaseCalls[0].eqCode, 'TK-001');
  });

  await t.test('PATCH and DELETE return 404 when the task does not exist', async () => {
    plannerUpdateResult = { data: [], error: null };
    const patchResponse = await plannerRoute.PATCH(new Request('http://localhost/api/planner', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'TK-MISSING', patch: { status: 'done' } }),
    }));
    assert.equal(patchResponse.status, 404);

    plannerDeleteResult = { data: [], error: null };
    const deleteResponse = await plannerRoute.DELETE(new Request('http://localhost/api/planner', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'TK-MISSING' }),
    }));
    assert.equal(deleteResponse.status, 404);
  });

  await t.test('returns 500 when the Planner database write fails', async () => {
    plannerUpdateResult = { data: null, error: { message: 'Planner database unavailable' } };
    const response = await plannerRoute.PATCH(new Request('http://localhost/api/planner', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'TK-001', patch: { status: 'done' } }),
    }));
    assert.equal(response.status, 500);
  });
});
