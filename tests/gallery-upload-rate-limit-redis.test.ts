import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import test from 'node:test';
import { createClient } from 'redis';

test('Gallery upload quota uses a Redis Hash with a one-hour TTL', async (context) => {
  const redisUrl = process.env.REDIS_URL;

  if (!redisUrl) {
    context.skip('REDIS_URL chưa được cấu hình');
    return;
  }

  const require = createRequire(import.meta.url);
  const serverOnlyPath = require.resolve('server-only');
  require.cache[serverOnlyPath] = {
    id: serverOnlyPath,
    filename: serverOnlyPath,
    loaded: true,
    exports: {},
  } as NodeModule;

  const { checkAndRecordGalleryUploadRateLimit } = await import(
    '../lib/storage/gallery-upload-rate-limit'
  );
  const userId = `redis-gallery-rate-${process.pid}-${Date.now()}`;
  const key = `rate:gallery-upload:${createHash('sha256').update(userId).digest('hex')}`;
  const client = createClient({ url: redisUrl });

  await client.connect();

  try {
    assert.equal((await checkAndRecordGalleryUploadRateLimit(userId, 1_024)).ok, true);
    assert.deepEqual(await client.hGetAll(key), { count: '1', bytes: '1024' });

    const ttl = await client.ttl(key);
    assert.ok(ttl > 0 && ttl <= 60 * 60);
  } finally {
    await client.del(key);
    if (client.isOpen) await client.quit();
  }
});
