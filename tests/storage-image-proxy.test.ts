import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { toCrmPhotoAssetUrl } from '@/lib/gallery/storage-image-src';

test('browser image helper preserves server-normalized media routes', () => {
  assert.equal(
    toCrmPhotoAssetUrl('/api/photos/file?path=gallery%2FPH-001%2Fthumb.webp&v=88'),
    '/api/photos/file?path=gallery%2FPH-001%2Fthumb.webp&v=88',
  );
  assert.equal(
    toCrmPhotoAssetUrl('https://cdn.example.test/image.webp'),
    'https://cdn.example.test/image.webp',
  );
  assert.equal(
    toCrmPhotoAssetUrl('http://127.0.0.1:54321/storage/v1/object/public/photos/gallery/PH-001/original.png'),
    'http://127.0.0.1:54321/storage/v1/object/public/photos/gallery/PH-001/original.png',
  );
});

test('CRM gallery asset URLs pass through unchanged', () => {
  const crm = '/api/photos/file?path=gallery%2FPH-001%2Fthumb.webp&v=88';
  assert.equal(toCrmPhotoAssetUrl(crm), crm);
});

test('browser image helpers do not retain legacy Supabase Storage URL parsing', () => {
  const browserHelpers = [
    'lib/gallery/storage-image-src.ts',
    'lib/gallery/gallery-helpers.ts',
  ].map((path) => readFileSync(join(process.cwd(), path), 'utf8')).join('\n');

  assert.doesNotMatch(browserHelpers, /storage\/v1/);
  assert.doesNotMatch(browserHelpers, /isLegacyPhotosBucketPublicUrl/);
});

test('CRM gallery media route accepts only allow-listed gallery variants', () => {
  const route = readFileSync(join(process.cwd(), 'app/api/photos/file/route.ts'), 'utf8');
  assert.match(route, /bffRoute/);
  assert.match(route, /gallery/);
  assert.match(route, /\(display\|thumb\)/);
  assert.match(route, /downloadPhotosBucketObject/);
  assert.doesNotMatch(route, /fetch\(/);
});

test('dynamic image preloading stays on the CRM media route', () => {
  const component = readFileSync(join(process.cwd(), 'components/gallery/StorageImage.tsx'), 'utf8');
  assert.match(component, /probe\.src = toCrmPhotoAssetUrl\(src\)/);
});
