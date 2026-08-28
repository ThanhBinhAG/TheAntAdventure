import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

test('branding logo file route proxies storage through service role', () => {
  const route = readFileSync(join(process.cwd(), 'app/api/branding/logo/file/route.ts'), 'utf8');
  assert.match(route, /bffRoute/);
  assert.match(route, /resolveCompanyLogoStoragePath/);
  assert.match(route, /downloadPhotosBucketObject/);
  assert.doesNotMatch(route, /getPublicUrl/);
});

test('gallery photo file route requires gallery.read and uses service download helper', () => {
  const route = readFileSync(join(process.cwd(), 'app/api/photos/file/route.ts'), 'utf8');
  assert.match(route, /requiredPermission:\s*'gallery\.read'/);
  assert.match(route, /downloadPhotosBucketObject/);
  assert.doesNotMatch(route, /getPublicUrl/);
});
