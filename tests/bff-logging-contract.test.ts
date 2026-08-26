import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import test, { mock } from 'node:test';
import { z } from 'zod';

const require = createRequire(import.meta.url);
const serverOnlyPath = require.resolve('server-only');
require.cache[serverOnlyPath] = {
  id: serverOnlyPath,
  filename: serverOnlyPath,
  loaded: true,
  exports: {},
} as NodeModule;

type AuthState = {
  authenticated: boolean;
  authenticationUnavailable?: true;
  userId: string | null;
};

let authState: AuthState = { authenticated: true, userId: 'user-42' };
let permissionResult: { allowed: boolean; status?: 401 | 403 } = { allowed: true };
const completions: Array<Record<string, unknown>> = [];
const errors: Array<Record<string, unknown>> = [];

mock.module(require.resolve('../lib/auth/session'), {
  namedExports: {
    getAuthContext: async () => ({
      ...authState,
      isSuperAdmin: false,
      isBreakGlass: false,
      email: null,
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

mock.module(require.resolve('../lib/system/server-logger'), {
  namedExports: {
    createHttpRequestLogger: (_request: Request, context: Record<string, unknown>) => ({
      logger: {
        error: (entry: Record<string, unknown>, message: string) => {
          errors.push({ ...entry, message });
        },
      },
      requestId: 'request-42',
      completeResponse: (response: Response, completion: Record<string, unknown>) => {
        completions.push({ ...context, ...completion, statusCode: response.status });
        response.headers.set('X-Request-Id', 'request-42');
        return response;
      },
    }),
  },
});

function reset(): void {
  authState = { authenticated: true, userId: 'user-42' };
  permissionResult = { allowed: true };
  completions.length = 0;
  errors.length = 0;
}

test('bffRoute completes every response with a request ID and safe failure event', async (t) => {
  const { bffRoute } = await import('../lib/bff/route');
  const options = {
    logging: { scope: 'test/bff', route: '/api/test' },
    requiredPermission: 'dashboard.read',
    querySchema: z.object({ valid: z.literal('yes') }),
    bodySchema: z.object({ value: z.number() }),
  };

  await t.test('401 and unavailable 503 complete before authentication', async () => {
    reset();
    authState = { authenticated: false, userId: null };
    const unauthenticated = await bffRoute(options, async () => ({ ok: true }))(
      new Request('https://crm.test/api/test'),
    );
    assert.equal(unauthenticated.status, 401);
    assert.equal(unauthenticated.headers.get('x-request-id'), 'request-42');

    authState = { authenticated: false, authenticationUnavailable: true, userId: null };
    const unavailable = await bffRoute(options, async () => ({ ok: true }))(
      new Request('https://crm.test/api/test'),
    );
    assert.equal(unavailable.status, 503);
    assert.deepEqual(completions.map((entry) => entry.statusCode), [401, 503]);
    assert.equal(completions[0].actorId, undefined);
  });

  await t.test('403, 400, 422, 302, 200, and 500 all complete exactly once', async () => {
    reset();
    permissionResult = { allowed: false, status: 403 };
    const forbidden = await bffRoute(options, async () => ({ ok: true }))(
      new Request('https://crm.test/api/test'),
    );
    assert.equal(forbidden.status, 403);

    permissionResult = { allowed: true };
    const invalidQuery = await bffRoute(options, async () => ({ ok: true }))(
      new Request('https://crm.test/api/test?valid=no'),
    );
    assert.equal(invalidQuery.status, 400);

    const invalidBody = await bffRoute(options, async () => ({ ok: true }))(
      new Request('https://crm.test/api/test?valid=yes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: 'invalid' }),
      }),
    );
    assert.equal(invalidBody.status, 422);

    const redirected = await bffRoute(options, async () => new Response(null, { status: 302 }))(
      new Request('https://crm.test/api/test?valid=yes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: 1 }),
      }),
    );
    assert.equal(redirected.status, 302);

    const succeeded = await bffRoute(options, async () => ({ ok: true }))(
      new Request('https://crm.test/api/test?valid=yes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: 1 }),
      }),
    );
    assert.equal(succeeded.status, 200);

    const failed = await bffRoute(options, async () => {
      throw new Error('access_token=must-not-reach-console');
    })(new Request('https://crm.test/api/test?valid=yes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: 1 }),
    }));
    assert.equal(failed.status, 500);
    assert.equal(failed.headers.get('x-request-id'), 'request-42');

    assert.deepEqual(completions.map((entry) => entry.statusCode), [403, 400, 422, 302, 200, 500]);
    assert.ok(completions.every((entry) => entry.actorId === 'user-42'));
    assert.deepEqual(errors, [{ event: 'bff.request.failed', err: errors[0].err, message: 'BFF request failed' }]);
  });
});

test('BFF routes keep static logging metadata for every wrapper call', () => {
  const root = process.cwd();
  const files: string[] = [];
  const collect = (directory: string) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const absolute = join(directory, entry.name);
      if (entry.isDirectory()) collect(absolute);
      else if (/\.ts$/.test(entry.name)) files.push(absolute);
    }
  };
  collect(join(root, 'app/api'));

  const missingMetadata = files
    .filter((file) => readFileSync(file, 'utf8').includes('bffRoute('))
    .filter((file) => {
      const source = readFileSync(file, 'utf8');
      const calls = source.match(/bffRoute\(/g)?.length ?? 0;
      const callsWithStaticMetadata = source.match(
        /bffRoute\(\s*\{\s*logging:\s*\{\s*scope:\s*'[^']+',\s*route:\s*'\/api[^']+'\s*\}/g,
      )?.length ?? 0;
      return calls !== callsWithStaticMetadata;
    })
    .map((file) => file.slice(root.length + 1));

  assert.deepEqual(missingMetadata, []);
});

test('Phase 3 sensitive direct routes use the HTTP completion wrapper', () => {
  const root = process.cwd();
  const routes = [
    'app/api/auth/logout/route.ts',
    'app/api/auth/permissions/route.ts',
    'app/api/auth/users/route.ts',
    'app/api/access-control/route.ts',
    'app/api/access-control/audit-logs/route.ts',
    'app/api/access-control/login-history/route.ts',
    'app/api/access-control/staff-roles/route.ts',
    'app/api/access-control/super-admin-status/route.ts',
    'app/api/access-control/users/route.ts',
    'app/api/photos/[id]/route.ts',
    'app/api/photos/delete/route.ts',
    'app/api/photos/upload/init/route.ts',
    'app/api/photos/upload/chunk/route.ts',
    'app/api/photos/upload/complete/route.ts',
    'app/api/branding/logo/route.ts',
    'app/api/dashboard/route.ts',
    'app/api/sidebar/badges/route.ts',
    'app/api/weather/boot/route.ts',
    'app/api/weather/destination/route.ts',
    'app/api/weather/destination/refresh/route.ts',
    'app/api/weather/destinations/route.ts',
    'app/api/weather/destinations/[id]/route.ts',
    'app/api/weather/destinations/featured/route.ts',
    'app/api/weather/refresh/route.ts',
    'app/api/weather/weekly/route.ts',
  ];

  const missingLogging = routes.filter(
    (route) => !readFileSync(join(root, route), 'utf8').includes('withHttpRequestLogging'),
  );

  assert.deepEqual(missingLogging, []);
});

test('server console logging is restricted to the explicit migration allowlist', () => {
  const root = process.cwd();
  const allowedConsoleCallCounts = new Map([
    ['lib/dashboard/dashboard-repository.ts', 1],
    ['lib/db/supabase/table-api.ts', 6],
    ['lib/redis/cache-helper.ts', 5],
    ['lib/redis/client.ts', 1],
    ['lib/redis/product-facets.ts', 1],
    ['lib/system/client-logger.ts', 3],
    ['lib/system/debug-logger.ts', 1],
  ]);
  const files: string[] = [];
  const collect = (directory: string) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const absolute = join(directory, entry.name);
      if (entry.isDirectory()) collect(absolute);
      else if (/\.(?:ts|tsx)$/.test(entry.name)) files.push(absolute);
    }
  };
  collect(join(root, 'app/api'));
  collect(join(root, 'lib'));

  const consoleCall = /console\.(?:error|warn|info|log|debug)\(/;
  const consoleCounts = new Map(
    files
      .map((file) => [
        file.slice(root.length + 1),
        readFileSync(file, 'utf8').match(new RegExp(consoleCall, 'g'))?.length ?? 0,
      ] as const)
      .filter(([, count]) => count > 0),
  );

  assert.deepEqual(consoleCounts, allowedConsoleCallCounts);
});
