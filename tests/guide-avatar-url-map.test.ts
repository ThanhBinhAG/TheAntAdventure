import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';

const require = createRequire(import.meta.url);
const serverOnlyPath = require.resolve('server-only');
require.cache[serverOnlyPath] = {
  id: serverOnlyPath,
  filename: serverOnlyPath,
  loaded: true,
  exports: {},
} as NodeModule;

test('guidePhotoForBrowser rewrites legacy Storage guide avatar URLs', async () => {
  const { guidePhotoForBrowser } = await import('@/lib/guides/guide-avatar');
  const legacy =
    'http://127.0.0.1:54321/storage/v1/object/public/photos/guides/G-N01/avatar.webp';
  assert.equal(
    guidePhotoForBrowser('G-N01', legacy),
    '/api/guides/avatar?guideId=G-N01',
  );
});

test('guidePhotoForBrowser keeps CRM avatar routes', async () => {
  const { guidePhotoForBrowser } = await import('@/lib/guides/guide-avatar');
  const crm = '/api/guides/avatar?guideId=G-N01';
  assert.equal(guidePhotoForBrowser('G-N01', crm), crm);
});

test('guidePhotoForBrowser passes through external URLs', async () => {
  const { guidePhotoForBrowser } = await import('@/lib/guides/guide-avatar');
  const external = 'https://cdn.example.com/avatar.jpg';
  assert.equal(guidePhotoForBrowser('G-N01', external), external);
});
