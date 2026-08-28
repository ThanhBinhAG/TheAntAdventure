import assert from 'node:assert/strict';
import test from 'node:test';
import {
  crmBrandingLogoFileUrl,
  crmGalleryAssetUrl,
  crmGalleryThumbUrl,
  isCrmGalleryAssetUrl,
  legacyPublicUrlToCrmGalleryUrl,
  legacyPublicUrlToStoragePath,
} from '@/lib/gallery/gallery-asset-url';

test('crmGalleryAssetUrl builds authenticated CRM file route', () => {
  assert.equal(
    crmGalleryAssetUrl('gallery/PH-001/display.webp', 88),
    '/api/photos/file?path=gallery%2FPH-001%2Fdisplay.webp&v=88',
  );
});

test('crmGalleryThumbUrl derives thumb variant from display storage path', () => {
  assert.equal(
    crmGalleryThumbUrl('gallery/PH-001/display.webp', 88),
    '/api/photos/file?path=gallery%2FPH-001%2Fthumb.webp&v=88',
  );
});

test('legacy public Supabase URLs rewrite to CRM gallery routes', () => {
  const legacy =
    'http://127.0.0.1:54321/storage/v1/object/public/photos/gallery/PH-001/thumb.webp?v=88';
  assert.equal(legacyPublicUrlToStoragePath(legacy), 'gallery/PH-001/thumb.webp');
  assert.equal(
    legacyPublicUrlToCrmGalleryUrl(legacy, 88),
    '/api/photos/file?path=gallery%2FPH-001%2Fthumb.webp&v=88',
  );
});

test('crmBrandingLogoFileUrl carries cache-bust version', () => {
  assert.equal(crmBrandingLogoFileUrl('1700000000'), '/api/branding/logo/file?v=1700000000');
});

test('isCrmGalleryAssetUrl recognizes CRM gallery routes', () => {
  assert.equal(isCrmGalleryAssetUrl('/api/photos/file?path=gallery%2FPH-001%2Fthumb.webp'), true);
  assert.equal(isCrmGalleryAssetUrl('https://example.test/photo.jpg'), false);
});
