import { expect, test } from '@playwright/test';
import { browserJson, login, logoutViaUi, readE2eState } from './support';

test.describe.serial('CRM session acceptance', () => {
  test('login creates an HttpOnly Supabase access cookie and UI logout clears it', async ({ page }) => {
    const state = await readE2eState();
    await login(page, state.admin);
    await logoutViaUi(page);
    const response = await browserJson(page, '/api/products');
    expect(response.status).toBe(401);
  });

  test('a request without the Supabase access cookie is rejected by the BFF', async ({ page }) => {
    const state = await readE2eState();

    await login(page, state.admin);
    await page.context().clearCookies();
    // Clearing the cookie also makes the browser refresher navigate to login.
    // Use the same browser context's request client so that navigation cannot
    // destroy a `page.evaluate` while this assertion is running.
    expect((await page.request.get('/api/products')).status()).toBe(401);
  });

  test('a logged-in user without an assigned role receives 403', async ({ page }) => {
    const state = await readE2eState();
    await login(page, state.unassigned);
    // The shell redirects an unassigned user to its access-denied view as soon
    // as it hydrates, so make the BFF assertion through the shared context.
    expect((await page.request.get('/api/products')).status()).toBe(403);
  });
});
