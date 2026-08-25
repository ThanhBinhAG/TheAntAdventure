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

test('server logger redacts secrets and preserves structured error details', async () => {
  const { createServerLogger } = await import('../lib/system/server-logger');
  const destination = new CapturingStream();
  const logger = createServerLogger({ level: 'trace', destination });

  logger.error(
    {
      err: new Error('Supabase request failed'),
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
  assert.equal((entry.err as { type?: string }).type, 'Error');
  assert.match(String((entry.err as { stack?: string }).stack), /Supabase request failed/);
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
