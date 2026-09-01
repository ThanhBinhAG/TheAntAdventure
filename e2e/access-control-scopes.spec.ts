import { expect, test } from '@playwright/test';
import { getAdminClient, login, readE2eState } from './support';

test.describe.serial('Access Control RLS scope acceptance', () => {
  test('hides Assigned while preserving a legacy Assigned scope stored for a role', async ({ page }) => {
    const state = await readE2eState();
    const admin = getAdminClient();
    const { data: before, error: beforeError } = await admin
      .from('role_resource_scopes')
      .select('scope')
      .eq('role_code', state.legacyScopeRoleCode)
      .eq('resource_code', 'bookings')
      .eq('action', 'read')
      .single();
    expect(beforeError).toBeNull();
    expect(before?.scope).toBe('assigned');

    await login(page, state.admin);
    await page.goto('/access-control');
    await page.getByRole('tab', { name: 'Roles & Permissions' }).click();
    await expect(page.getByRole('button', { name: state.legacyScopeRoleLabel })).toBeVisible();
    await page.getByRole('button', { name: state.legacyScopeRoleLabel }).click();
    await page.getByRole('tab', { name: 'RLS data scopes' }).click();

    await expect(page.getByRole('radio', { name: 'Own' }).first()).toBeVisible();
    await expect(page.getByRole('radio', { name: 'All' }).first()).toBeVisible();
    await expect(page.getByRole('radio', { name: 'Assigned' })).toHaveCount(0);

    const { data: after, error: afterError } = await admin
      .from('role_resource_scopes')
      .select('scope')
      .eq('role_code', state.legacyScopeRoleCode)
      .eq('resource_code', 'bookings')
      .eq('action', 'read')
      .single();
    expect(afterError).toBeNull();
    expect(after?.scope).toBe('assigned');
  });
});
