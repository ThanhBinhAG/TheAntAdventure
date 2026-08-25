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
