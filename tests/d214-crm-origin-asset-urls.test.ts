import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { mapGalleryPhotoForClient } from '@/lib/gallery/gallery-photo-dto';
import { mapBrandingLogoUrlForClient } from '@/lib/gallery/gallery-asset-url';

const require = createRequire(import.meta.url);
const serverOnlyPath = require.resolve('server-only');
require.cache[serverOnlyPath] = {
  id: serverOnlyPath,
  filename: serverOnlyPath,
  loaded: true,
  exports: {},
} as NodeModule;

const CLIENT_ROOTS = ['components', 'hooks'] as const;

const FORBIDDEN_CLIENT_PATTERNS = [
  /getPublicUrl\s*\(/,
  /createSignedUrl\s*\(/,
  /NEXT_PUBLIC_SUPABASE/,
  /PHOTOS_BUCKET_PUBLIC_URL_PREFIX/,
  /legacyPublicUrlToCrmGalleryUrl/,
];

function walkTsFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      out.push(...walkTsFiles(full));
      continue;
    }
    if (/\.(ts|tsx)$/.test(entry)) out.push(full);
  }
  return out;
}

test('D2.14 client tree does not build Supabase storage URLs', () => {
  const files = CLIENT_ROOTS.flatMap((root) => walkTsFiles(join(process.cwd(), root)));
  assert.ok(files.length > 0);
  for (const file of files) {
    const source = readFileSync(file, 'utf8');
    for (const pattern of FORBIDDEN_CLIENT_PATTERNS) {
      assert.doesNotMatch(
        source,
        pattern,
        `${file} must not contain ${pattern}`,
      );
    }
  }
});

test('mapGalleryPhotoForClient never returns legacy storage URLs', () => {
  const mapped = mapGalleryPhotoForClient({
    id: 'PH-001',
    url: 'http://127.0.0.1:54321/storage/v1/object/public/photos/gallery/PH-001/display.webp',
    thumb_url:
      'http://127.0.0.1:54321/storage/v1/object/public/photos/gallery/PH-001/thumb.webp',
    display_bytes: 42,
  });
  assert.ok(mapped.url);
  assert.match(mapped.url, /^\/api\/photos\/file\?/);
  assert.ok(mapped.thumbUrl);
  assert.match(mapped.thumbUrl, /^\/api\/photos\/file\?/);
  assert.doesNotMatch(JSON.stringify(mapped), /storage\/v1|supabase\.co/);
});

test('branding and guide mappers return CRM-origin URLs', async () => {
  const logo = mapBrandingLogoUrlForClient(
    'https://abc.supabase.co/storage/v1/object/public/photos/branding/logo-1.webp',
  );
  assert.equal(logo, '/api/branding/logo/file?v=1');

  const { guidePhotoForBrowser } = await import('@/lib/guides/guide-avatar');
  const guide = guidePhotoForBrowser(
    'G-N01',
    'http://127.0.0.1:54321/storage/v1/object/public/photos/guides/G-N01/avatar.webp',
  );
  assert.equal(guide, '/api/guides/avatar?guideId=G-N01');
});

test('indirect product and attraction APIs do not embed storage URLs in repositories', () => {
  const attractionRepo = readFileSync(
    join(process.cwd(), 'lib/attractions/attraction-repository.ts'),
    'utf8',
  );
  const productRepo = readFileSync(
    join(process.cwd(), 'lib/products/product-repository.ts'),
    'utf8',
  );
  assert.doesNotMatch(attractionRepo, /getPublicUrl|storage\/v1\/object\/public/);
  assert.doesNotMatch(productRepo, /getPublicUrl|storage\/v1\/object\/public/);
  assert.match(readFileSync(join(process.cwd(), 'lib/products/product-list-server.ts'), 'utf8'), /mapGalleryPhotoForClient/);
});
