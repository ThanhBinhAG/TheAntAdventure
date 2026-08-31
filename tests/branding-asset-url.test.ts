import assert from 'node:assert/strict';
import test from 'node:test';
import {
  crmBrandingLogoFileUrl,
  mapBrandingLogoUrlForClient,
} from '@/lib/gallery/gallery-asset-url';

test('mapBrandingLogoUrlForClient keeps CRM branding routes', () => {
  const crm = crmBrandingLogoFileUrl('1700000000');
  assert.equal(mapBrandingLogoUrlForClient(crm), crm);
});

test('mapBrandingLogoUrlForClient rewrites legacy Supabase public logo URLs', () => {
  const legacy =
    'http://127.0.0.1:54321/storage/v1/object/public/photos/branding/logo-1700000000.webp';
  assert.equal(
    mapBrandingLogoUrlForClient(legacy),
    '/api/branding/logo/file?v=1700000000',
  );
});

test('mapBrandingLogoUrlForClient rewrites hosted Supabase logo URLs', () => {
  const legacy =
    'https://abc.supabase.co/storage/v1/object/public/photos/branding/logo-999.webp';
  assert.equal(mapBrandingLogoUrlForClient(legacy), '/api/branding/logo/file?v=999');
});

test('mapBrandingLogoUrlForClient maps fixed legacy logo path to CRM route', () => {
  const legacy = 'http://127.0.0.1:54321/storage/v1/object/public/photos/branding/logo.webp';
  assert.equal(mapBrandingLogoUrlForClient(legacy), '/api/branding/logo/file');
});

test('mapBrandingLogoUrlForClient returns null for empty input', () => {
  assert.equal(mapBrandingLogoUrlForClient(null), null);
  assert.equal(mapBrandingLogoUrlForClient(''), null);
});
