import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

test('Settings nav sits under Access Control and catalogs BFF exists', () => {
  const root = process.cwd();
  const constants = readFileSync(join(root, 'lib/constants.ts'), 'utf8');
  const permissions = readFileSync(join(root, 'lib/auth/permissions.ts'), 'utf8');
  const pages = readFileSync(join(root, 'components/pages/index.ts'), 'utf8');
  const route = join(root, 'app/api/settings/catalogs/route.ts');
  const migration = join(root, 'supabase/migrations/20260905103000_add_crm_catalog_items_and_settings.sql');
  const form = readFileSync(join(root, 'components/customers/CustomerFormModal.tsx'), 'utf8');

  assert.equal(existsSync(route), true);
  assert.equal(existsSync(migration), true);
  assert.match(constants, /page: 'settings'/);
  assert.match(constants, /page: 'access-control'/);
  assert.ok(
    constants.indexOf("page: 'access-control'") < constants.indexOf("page: 'settings'"),
    'Settings must appear after Access Control in NAV_SECTIONS',
  );
  assert.match(permissions, /settings: 'settings\.read'/);
  assert.match(permissions, /settings: 'settings\.write'/);
  assert.match(pages, /settings: loadPage/);
  assert.match(readFileSync(route, 'utf8'), /requiredPermission: 'settings\.write'/);
  assert.match(readFileSync(migration, 'utf8'), /crm_catalog_items/);
  assert.match(form, /\/api\/settings\/catalogs/);
  assert.doesNotMatch(form, /TravelStyleManagerModal/);
  assert.doesNotMatch(form, /options=\{COUNTRIES\}/);
  const settingsPage = readFileSync(join(root, 'components/settings/SettingsPage.tsx'), 'utf8');
  assert.match(settingsPage, /settings-hub/);
  assert.match(settingsPage, /section=catalogs|section', id|sectionParam === 'catalogs'/);
});
