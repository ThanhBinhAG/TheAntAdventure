import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';
import { Writable } from 'node:stream';

const require = createRequire(import.meta.url);
const serverOnlyPath = require.resolve('server-only');
require.cache[serverOnlyPath] = {
  id: serverOnlyPath,
  filename: serverOnlyPath,
  loaded: true,
  exports: {},
} as NodeModule;

class CapturingStream extends Writable {
  readonly lines: string[] = [];

  _write(chunk: Buffer, _encoding: BufferEncoding, callback: (error?: Error | null) => void): void {
    this.lines.push(chunk.toString());
    callback();
  }
}

test('server logger redacts secrets and serializes only safe error details', async () => {
  const { createServerLogger } = await import('../lib/system/server-logger');
  const destination = new CapturingStream();
  const logger = createServerLogger({ level: 'trace', destination });
  const upstreamError = Object.assign(
    new Error('Upstream failed: access_token=message-access-token api_token:message-api-token clientSecret=message-client-secret Bearer message-bearer-token'),
    {
      access_token: 'property-access-token',
      api_token: 'property-api-token',
      clientSecret: 'property-client-secret',
      code: 'UPSTREAM_AUTH_FAILED',
    }
  );
  upstreamError.stack = 'Error: refresh_token=stack-refresh-token';

  logger.error(
    {
      err: upstreamError,
      password: 'password-must-not-appear',
      headers: {
        authorization: 'Bearer top-secret',
        cookie: 'sb-access=secret',
      },
      payload: { token: 'nested-token' },
    },
    'Supabase request failed'
  );

  const entry = JSON.parse(destination.lines.join('')) as Record<string, unknown>;
  assert.equal(entry.password, '[redacted]');
  assert.deepEqual(entry.headers, {
    authorization: '[redacted]',
    cookie: '[redacted]',
  });
  assert.deepEqual(entry.payload, { token: '[redacted]' });
  assert.deepEqual(entry.err, { type: 'Error', code: 'UPSTREAM_AUTH_FAILED' });
  const serialized = JSON.stringify(entry);
  assert.doesNotMatch(serialized, /message-|property-|stack-refresh-token/);
  assert.equal(entry.service, 'the-ant-adventures-crm');
});

test('server logger applies safe log levels and request IDs', async () => {
  const { getOrCreateRequestId, resolveLogLevel } = await import('../lib/system/server-logger');

  assert.equal(resolveLogLevel('debug'), 'debug');
  assert.equal(resolveLogLevel('invalid'), 'info');
  assert.equal(getOrCreateRequestId(new Request('https://crm.test', {
    headers: { 'x-request-id': 'edge-42' },
  })), 'edge-42');
  assert.match(
    getOrCreateRequestId(new Request('https://crm.test', {
      headers: { 'x-request-id': 'unsafe value' },
    })),
    /^[0-9a-f-]{36}$/
  );
});

test('HTTP logging contract adds request context and selects the completion level', async () => {
  const { createHttpRequestLogger, createServerLogger } = await import('../lib/system/server-logger');
  const destination = new CapturingStream();
  const logger = createServerLogger({ level: 'trace', destination });
  const request = new Request('https://crm.test/api/products', {
    method: 'POST',
    headers: { 'x-request-id': 'request-42' },
  });

  const httpLogger = createHttpRequestLogger(
    request,
    {
      scope: 'catalog/products',
      route: '/api/products',
    },
    logger
  );
  httpLogger.logCompletion({ statusCode: 201, durationMs: 27, resourceId: 'product-42', actorId: 'user-42' });
  httpLogger.logCompletion({ statusCode: 302, durationMs: 2 });
  httpLogger.logCompletion({ statusCode: 401, durationMs: 3 });
  httpLogger.logCompletion({ statusCode: 503, durationMs: 8 });

  const healthLogger = createHttpRequestLogger(
    new Request('https://crm.test/api/health'),
    { scope: 'system/health', route: '/api/health', healthCheck: true },
    logger
  );
  healthLogger.logCompletion({ statusCode: 200, durationMs: 1 });
  healthLogger.logCompletion({ statusCode: 503, durationMs: 1 });

  const entries = destination.lines.map((line) => JSON.parse(line) as Record<string, unknown>);
  assert.deepEqual(entries.map((entry) => entry.level), [30, 30, 40, 50, 20, 50]);
  assert.deepEqual(entries[0], {
    level: 30,
    time: entries[0].time,
    service: 'the-ant-adventures-crm',
    environment: process.env.NODE_ENV ?? 'development',
    version: process.env.APP_VERSION ?? 'unknown',
    scope: 'catalog/products',
    requestId: 'request-42',
    route: '/api/products',
    method: 'POST',
    actorId: 'user-42',
    event: 'http.request.completed',
    statusCode: 201,
    durationMs: 27,
    resourceId: 'product-42',
    msg: 'HTTP request completed',
  });
});

test('HTTP logging contract rejects unsafe actor and resource identifiers', async () => {
  const { createHttpRequestLogger, createServerLogger } = await import('../lib/system/server-logger');
  const destination = new CapturingStream();
  const logger = createServerLogger({ level: 'trace', destination });
  const httpLogger = createHttpRequestLogger(
    new Request('https://crm.test/api/products'),
    { scope: 'catalog/products', route: '/api/products', actorId: 'person@example.test' },
    logger
  );

  httpLogger.logCompletion({ statusCode: 200, durationMs: -4, resourceId: 'Bearer unsafe-token' });

  const entry = JSON.parse(destination.lines.join('')) as Record<string, unknown>;
  assert.equal(entry.actorId, undefined);
  assert.equal(entry.resourceId, undefined);
  assert.equal(entry.durationMs, 0);
});

test('HTTP response helper returns the request ID and emits one completion event', async () => {
  const { createHttpRequestLogger, createServerLogger } = await import('../lib/system/server-logger');
  const destination = new CapturingStream();
  const logger = createServerLogger({ level: 'trace', destination });
  const httpLogger = createHttpRequestLogger(
    new Request('https://crm.test/api/products', {
      method: 'PATCH',
      headers: { 'x-request-id': 'response-42' },
    }),
    { scope: 'catalog/products', route: '/api/products' },
    logger,
  );

  const response = httpLogger.completeResponse(new Response(null, { status: 302 }), {
    actorId: 'user-42',
    resourceId: 'product-42',
  });

  assert.equal(response.headers.get('x-request-id'), 'response-42');
  const entry = JSON.parse(destination.lines.join('')) as Record<string, unknown>;
  assert.equal(entry.level, 30);
  assert.equal(entry.event, 'http.request.completed');
  assert.equal(entry.statusCode, 302);
  assert.equal(entry.actorId, 'user-42');
  assert.equal(entry.resourceId, 'product-42');
  assert.equal(typeof entry.durationMs, 'number');
});

test('direct API wrapper completes every returned response once', async () => {
  const { createServerLogger, withHttpRequestLogging } = await import('../lib/system/server-logger');
  const destination = new CapturingStream();
  const logger = createServerLogger({ level: 'trace', destination });
  const handler = withHttpRequestLogging(
    { scope: 'catalog/products', route: '/api/products' },
    async () => new Response(null, { status: 401 }),
    logger,
  );

  const response = await handler(
    new Request('https://crm.test/api/products', {
      headers: { 'x-request-id': 'wrapper-42' },
    }),
    { params: Promise.resolve({}) },
  );

  assert.equal(response.headers.get('x-request-id'), 'wrapper-42');
  const entries = destination.lines.map((line) => JSON.parse(line) as Record<string, unknown>);
  assert.equal(entries.length, 1);
  assert.equal(entries[0].event, 'http.request.completed');
  assert.equal(entries[0].statusCode, 401);
  assert.equal(entries[0].requestId, 'wrapper-42');
});
