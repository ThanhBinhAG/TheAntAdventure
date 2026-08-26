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
const calls: Array<{ client: unknown; input: unknown }> = [];
class MockTourDesignSaveConflictError extends Error {
  constructor(readonly currentSaveRevision?: number) {
    super('Thiết kế tour đã được thay đổi bởi một lượt lưu mới hơn.');
  }
}
let workflowError: Error | null = null;
const workflowResult = {
  draft: { id: 'TD-001', leadId: 'LD-001', custId: 'C-001', outlineStatus: 'sent', saveRevision: 5 },
  lead: { id: 'LD-001', stage: 'Proposal Sent' },
  comm: { id: 'CM-001', cid: 'C-001', type: 'Note', dir: 'outbound' },
};

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
  namedExports: { getServerSupabaseClient: async () => ({ kind: 'user-scoped-client' }) },
});

mock.module(require.resolve('../lib/tour-design/tour-design-repository'), {
  namedExports: {
    applyTourDesignOutlineWorkflowServer: async (client: unknown, input: unknown) => {
      calls.push({ client, input });
      if (workflowError) throw workflowError;
      return workflowResult;
    },
    TourDesignSaveConflictError: MockTourDesignSaveConflictError,
  },
});

const validBody = {
  action: 'sent',
  draft: { id: 'TD-001', leadId: 'LD-001', custId: 'C-001', outlineStatus: 'draft' },
  outlineDays: [],
  expectedSaveRevision: 4,
};

test('Tour Design Outline workflow persists through a write-protected BFF route', async (t) => {
  const route = await import('../app/api/tour-design/outline-workflow/route');

  await t.beforeEach(() => {
    authenticated = true;
    writeAllowed = true;
    workflowError = null;
    calls.length = 0;
  });

  await t.test('returns 401 without a CRM session', async () => {
    authenticated = false;
    const response = await route.POST(new Request('http://localhost/api/tour-design/outline-workflow', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(validBody),
    }));
    assert.equal(response.status, 401);
    assert.equal(calls.length, 0);
  });

  await t.test('returns 403 without tour_design.write', async () => {
    writeAllowed = false;
    const response = await route.POST(new Request('http://localhost/api/tour-design/outline-workflow', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(validBody),
    }));
    assert.equal(response.status, 403);
    assert.equal(calls.length, 0);
  });

  await t.test('returns 422 before persistence for an invalid action', async () => {
    const response = await route.POST(new Request('http://localhost/api/tour-design/outline-workflow', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...validBody, action: 'delete' }),
    }));
    assert.equal(response.status, 422);
    assert.equal(calls.length, 0);
  });

  await t.test('uses the transactional server workflow result', async () => {
    const response = await route.POST(new Request('http://localhost/api/tour-design/outline-workflow', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(validBody),
    }));
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { ok: true, data: workflowResult });
    assert.deepEqual(calls, [{ client: { kind: 'user-scoped-client' }, input: validBody }]);
  });

  await t.test('returns 409 for a stale save revision without reporting local success', async () => {
    workflowError = new MockTourDesignSaveConflictError(5);
    const response = await route.POST(new Request('http://localhost/api/tour-design/outline-workflow', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(validBody),
    }));
    assert.equal(response.status, 409);
    assert.deepEqual(await response.json(), {
      ok: false,
      error: 'Thiết kế tour đã được thay đổi bởi một lượt lưu mới hơn.',
      currentSaveRevision: 5,
    });
  });
});
