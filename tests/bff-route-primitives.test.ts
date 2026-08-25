import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test, { mock } from 'node:test';
import { z } from 'zod';

// Bypass server-only warning/error in tests
const require = createRequire(import.meta.url);
const serverOnlyPath = require.resolve('server-only');
require.cache[serverOnlyPath] = {
  id: serverOnlyPath,
  filename: serverOnlyPath,
  loaded: true,
  exports: {},
} as NodeModule;

// Mock dependencies before importing route handler
let verificationUnavailable = false;
mock.module(require.resolve('../lib/auth/session'), {
  namedExports: {
    getAuthContext: async () => {
      if (verificationUnavailable) {
        return {
          authenticated: false,
          isSuperAdmin: false,
          isBreakGlass: false,
          userId: null,
          email: null,
          verificationUnavailable: true,
        };
      }
      // Mock default: authenticated but no special role
      return {
        authenticated: true,
        isSuperAdmin: false,
        isBreakGlass: false,
        userId: 'test-user-id',
        email: 'user@example.com',
      };
    },
  },
});

let permissionOverride: { allowed: boolean; status?: 401 | 403 } | null = null;

mock.module(require.resolve('../lib/auth/permissions-server'), {
  namedExports: {
    checkPermissionForRequest: async (requiredPermission: string) => {
      if (permissionOverride) {
        return permissionOverride;
      }
      // Allow dashboard.read by default, forbid others
      if (requiredPermission === 'dashboard.read') {
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
        from: () => ({
          select: () => Promise.resolve({ data: [], error: null }),
        }),
      } as any;
    },
  },
});

test('BFF Request Primitives - Route Wrapper Tests', async (t) => {
  const { bffRoute } = await import('../lib/bff/route');

  await t.test('503 Service Unavailable - when JWKS verification is temporarily unavailable', async () => {
    verificationUnavailable = true;
    try {
      const handler = bffRoute({}, async () => ({ data: 'should not reach here' }));
      const response = await handler(new Request('http://localhost/api/test'));

      assert.equal(response.status, 503);
      assert.equal(response.headers.get('retry-after'), '30');
      assert.deepEqual(await response.json(), {
        ok: false,
        error: 'Dịch vụ xác thực tạm thời không khả dụng.',
      });
    } finally {
      verificationUnavailable = false;
    }
  });

  await t.test('401 Unauthorized - when session is not valid', async () => {
    // Override permission check to simulate unauthenticated user (401)
    permissionOverride = {
      allowed: false,
      status: 401,
    };

    const handler = bffRoute(
      { requiredPermission: 'dashboard.read' },
      async () => {
        return { data: 'should not reach here' };
      }
    );

    const response = await handler(new Request('http://localhost/api/test'));
    assert.equal(response.status, 401);
    const json = await response.json();
    assert.equal(json.ok, false);
    assert.match(json.error, /Chưa đăng nhập/);

    // Restore original mock state
    permissionOverride = null;
  });

  await t.test('403 Forbidden - when user lacks required permission', async () => {
    const handler = bffRoute(
      { requiredPermission: 'hr.write' }, // We mocked permissions-server to deny anything except dashboard.read
      async () => {
        return { data: 'should not reach here' };
      }
    );

    const response = await handler(new Request('http://localhost/api/test'));
    assert.equal(response.status, 403);
    const json = await response.json();
    assert.equal(json.ok, false);
    assert.match(json.error, /không có quyền/);
  });

  await t.test('400 Bad Request - when query parameters fail Zod validation', async () => {
    const handler = bffRoute(
      {
        requiredPermission: 'dashboard.read',
        querySchema: z.object({
          id: z.string().uuid(), // Expecting a UUID
        }),
      },
      async () => {
        return { data: 'should not reach here' };
      }
    );

    // Pass invalid query string 'id=123' (not a UUID)
    const response = await handler(new Request('http://localhost/api/test?id=123'));
    assert.equal(response.status, 400);
    const json = await response.json();
    assert.equal(json.ok, false);
    assert.equal(json.error, 'Tham số truy vấn không hợp lệ.');
    assert.ok(json.details);
  });

  await t.test('422 Unprocessable Entity - when body fails Zod validation', async () => {
    const handler = bffRoute(
      {
        requiredPermission: 'dashboard.read',
        bodySchema: z.object({
          age: z.number().min(18), // Age must be >= 18
        }),
      },
      async () => {
        return { data: 'should not reach here' };
      }
    );

    // Send body with age = 15 (invalid)
    const response = await handler(
      new Request('http://localhost/api/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ age: 15 }),
      })
    );

    assert.equal(response.status, 422);
    const json = await response.json();
    assert.equal(json.ok, false);
    assert.equal(json.error, 'Dữ liệu yêu cầu không hợp lệ.');
    assert.ok(json.details);
  });

  await t.test('500 Internal Server Error - when handler throws error', async () => {
    const handler = bffRoute(
      { requiredPermission: 'dashboard.read' },
      async () => {
        throw new Error('Database connection failed');
      }
    );

    const response = await handler(new Request('http://localhost/api/test'));
    assert.equal(response.status, 500);
    const json = await response.json();
    assert.equal(json.ok, false);
    assert.equal(json.error, 'Database connection failed');
  });

  await t.test('200 OK - when permission and input are valid', async () => {
    const handler = bffRoute(
      {
        requiredPermission: 'dashboard.read',
        querySchema: z.object({
          name: z.string(),
        }),
        bodySchema: z.object({
          value: z.number(),
        }),
      },
      async ({ query, body }) => {
        return {
          greeting: `Hello ${query.name}`,
          received: body.value,
        };
      }
    );

    const response = await handler(
      new Request('http://localhost/api/test?name=Alice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: 42 }),
      })
    );

    assert.equal(response.status, 200);
    const json = await response.json();
    assert.equal(json.ok, true);
    assert.deepEqual(json.data, {
      greeting: 'Hello Alice',
      received: 42,
    });
  });
});
