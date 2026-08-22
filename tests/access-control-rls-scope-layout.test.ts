import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { describe, it } from 'node:test';

const tabPath = new URL('../components/access-control/RolesPermissionsTab.tsx', import.meta.url);
const scopesTabPath = new URL('../components/access-control/roles-permissions/ResourceScopesTabContent.tsx', import.meta.url);
const stylesPath = new URL('../components/access-control/AccessControlPage.module.css', import.meta.url);

describe('RLS data scopes layout', () => {
  it('separates function permissions and RLS data scopes into role configuration tabs', async () => {
    const [tab, scopesTab, styles] = await Promise.all([
      readFile(tabPath, 'utf8'),
      readFile(scopesTabPath, 'utf8'),
      readFile(stylesPath, 'utf8'),
    ]);

    assert.match(tab, /type RoleConfigurationTab = 'permissions' \| 'scopes';/);
    assert.match(tab, /<Tabs[\s\S]*className=\{styles\.roleConfigurationTabs\}/);
    assert.match(tab, /key: 'permissions'/);
    assert.match(tab, /key: 'scopes'/);
    assert.match(scopesTab, /styles\.resourceScopesGrid/);
    assert.match(scopesTab, /styles\.resourceScopeCard/);
    assert.match(scopesTab, /styles\.resourceScopeActionRow/);
    assert.match(styles, /\.roleConfigurationTabs\s+:global\(\.ant-tabs-nav\)/);
    assert.match(styles, /\.resourceScopesSection\[hidden\]\s*\{/);
    assert.match(styles, /\.resourceScopesGrid\s*\{/);
    assert.match(styles, /\.resourceScopeCard\s*\{/);
    assert.match(styles, /\.resourceScopeActionRow\s*\{/);
  });
});
