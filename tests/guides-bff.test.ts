import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { BFF_MANAGED_TABLES } from '@/lib/db/bff-managed-tables';
import { PAGE_BOOT_TABLES } from '@/lib/db/sync-config';
import { guideAvatarApiUrl } from '@/lib/guides/guide-avatar-url';
import { guideSchema } from '@/lib/guides/guide-input';

function source(path: string): string {
  return readFileSync(join(process.cwd(), path), 'utf8');
}

test('Guides page uses CRM BFF instead of the browser Supabase client', () => {
  const page = source('components/guides/GuidesPage.tsx');
  const hook = source('hooks/useGuidesPage.ts');
  assert.match(page, /useGuidesPage/);
  assert.doesNotMatch(page, /getBffArray<Guide>\('\/api\/guides'/);
  assert.match(page, /fetch\('\/api\/guides'/);
  assert.match(page, /uploadGuideAvatarClient/);
  assert.doesNotMatch(page, /lib\/supabase\/client/);
  assert.doesNotMatch(page, /upload-guide-avatar/);
  assert.match(hook, /getBffArray/);
  assert.match(hook, /\/api\/guides/);
  assert.match(hook, /withoutAutoSyncAsync/);
  assert.match(hook, /inflight/);
  assert.equal((PAGE_BOOT_TABLES.guides ?? []).length, 0);
  assert.equal(BFF_MANAGED_TABLES.has('guides'), true);
});

test('Guide BFF contract validates a complete guide and uses a same-origin avatar proxy', () => {
  const parsed = guideSchema.safeParse({ id: 'G-N01', fullname: 'Trang' });
  assert.equal(parsed.success, true);
  if (!parsed.success) return;
  assert.equal(parsed.data.rate, 0);
  assert.equal(parsed.data.photo, '');
  assert.equal(guideAvatarApiUrl('G N/01'), '/api/guides/avatar?guideId=G%20N%2F01');
});

test('Guide data and avatar API routes enforce Guide permissions and do not expose storage URLs', () => {
  const guidesRoute = source('app/api/guides/route.ts');
  const avatarRoute = source('app/api/guides/avatar/route.ts');
  assert.match(guidesRoute, /requiredPermission: 'guides\.read'/);
  assert.match(guidesRoute, /requiredPermission: 'guides\.write'/);
  assert.match(avatarRoute, /checkPermissionForRequest\('guides\.write'/);
  assert.match(avatarRoute, /hasTrustedRequestOrigin/);
  assert.match(avatarRoute, /authenticationUnavailable/);
  assert.match(avatarRoute, /storage\.from\(PHOTOS_BUCKET\)\.download/);
  assert.match(source('lib/guides/guide-avatar.ts'), /guidePhotoForBrowser/);
  assert.doesNotMatch(avatarRoute, /getPublicUrl/);
});
