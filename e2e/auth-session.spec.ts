import { expect, test } from '@playwright/test';
import { browserJson, crmSessionId, getAdminClient, login, logoutViaUi, readE2eState } from './support';

test.describe.serial('CRM session acceptance', () => {
  test('login creates an HttpOnly CRM cookie and UI logout revokes it', async ({ page }) => {
    const state = await readE2eState();
    await login(page, state.admin);
    await logoutViaUi(page);
    const response = await browserJson(page, '/api/products');
    expect(response.status).toBe(401);
  });

  test('revoked and expired durable sessions are rejected by the BFF', async ({ page }) => {
    const state = await readE2eState();
    const admin = getAdminClient();

    await login(page, state.admin);
    const revokedSid = await crmSessionId(page);
    await admin.from('crm_sessions').update({ revoked_at: new Date().toISOString() }).eq('sid', revokedSid);
    expect((await browserJson(page, '/api/products')).status).toBe(401);

    await page.context().clearCookies();
    await login(page, state.admin);
    const expiredSid = await crmSessionId(page);
    await admin.from('crm_sessions').update({ expires_at: new Date(0).toISOString() }).eq('sid', expiredSid);
    expect((await browserJson(page, '/api/products')).status).toBe(401);
  });

  test('a logged-in user without an assigned role receives 403', async ({ page }) => {
    const state = await readE2eState();
    await login(page, state.unassigned);
    expect((await browserJson(page, '/api/products')).status).toBe(403);
  });
});
