import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

type Mod = typeof import('../lib/storage/gallery-upload-rate-limit');
let checkAndRecordGalleryUploadRateLimit: Mod['checkAndRecordGalleryUploadRateLimit'];
let resetGalleryUploadRateLimit: Mod['resetGalleryUploadRateLimit'];
let originalRedisUrl: string | undefined;

before(async () => {
  originalRedisUrl = process.env.REDIS_URL;
  delete process.env.REDIS_URL;

  const require = createRequire(import.meta.url);
  const serverOnlyPath = require.resolve('server-only');
  require.cache[serverOnlyPath] = {
    id: serverOnlyPath,
    filename: serverOnlyPath,
    loaded: true,
    exports: {},
  } as NodeModule;

  ({ checkAndRecordGalleryUploadRateLimit, resetGalleryUploadRateLimit } = await import(
    '../lib/storage/gallery-upload-rate-limit'
  ));
});

after(() => {
  if (originalRedisUrl === undefined) delete process.env.REDIS_URL;
  else process.env.REDIS_URL = originalRedisUrl;
});

describe('gallery upload rate limit', () => {
  it('allows uploads under the per-user quota', async () => {
    const userId = `user-${Date.now()}-${Math.random()}`;
    resetGalleryUploadRateLimit(userId);
    for (let i = 0; i < 5; i++) {
      assert.equal((await checkAndRecordGalleryUploadRateLimit(userId, 1_000_000)).ok, true);
    }
  });

  it('blocks after exceeding the upload count quota', async () => {
    const userId = `count-${Date.now()}-${Math.random()}`;
    resetGalleryUploadRateLimit(userId);
    for (let i = 0; i < 100; i++) {
      assert.equal((await checkAndRecordGalleryUploadRateLimit(userId, 1)).ok, true);
    }
    const blocked = await checkAndRecordGalleryUploadRateLimit(userId, 1);
    assert.equal(blocked.ok, false);
    if (!blocked.ok) assert.ok(blocked.retryAfterSec >= 1);
  });

  it('blocks after exceeding the bytes/hour quota', async () => {
    const userId = `bytes-${Date.now()}-${Math.random()}`;
    resetGalleryUploadRateLimit(userId);
    assert.equal((await checkAndRecordGalleryUploadRateLimit(userId, 9_000_000_000)).ok, true);
    const blocked = await checkAndRecordGalleryUploadRateLimit(userId, 2_000_000_000);
    assert.equal(blocked.ok, false);
  });

  it('tracks separate buckets per user', async () => {
    const userA = `a-${Date.now()}-${Math.random()}`;
    const userB = `b-${Date.now()}-${Math.random()}`;
    resetGalleryUploadRateLimit(userA);
    resetGalleryUploadRateLimit(userB);
    for (let i = 0; i < 100; i++) {
      assert.equal((await checkAndRecordGalleryUploadRateLimit(userA, 1)).ok, true);
    }
    assert.equal((await checkAndRecordGalleryUploadRateLimit(userA, 1)).ok, false);
    assert.equal((await checkAndRecordGalleryUploadRateLimit(userB, 1)).ok, true);
  });
});
