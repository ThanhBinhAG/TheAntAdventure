import { expect, test } from '@playwright/test';
import { login, readE2eState } from './support';

const devAPages = ['/products', '/planner', '/attractions', '/tourdesign'];

test('Dev A screens issue HTTP(S) requests only to the CRM origin', async ({ page, baseURL }) => {
  const state = await readE2eState();
  const crmOrigin = new URL(baseURL ?? 'http://localhost:3006').origin;
  const offOriginRequests = new Map<string, Set<string>>();
  let activePath = '/login';

  page.on('request', (request) => {
    const url = new URL(request.url());
    if ((url.protocol === 'http:' || url.protocol === 'https:') && url.origin !== crmOrigin) {
      const origins = offOriginRequests.get(activePath) ?? new Set<string>();
      origins.add(url.origin);
      offOriginRequests.set(activePath, origins);
    }
  });

  await login(page, state.admin);
  // Let the legacy dashboard boot finish so only each target page is audited below.
  await page.waitForTimeout(3_000);
  offOriginRequests.clear();
  for (const path of devAPages) {
    activePath = path;
    await page.goto(path);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);
  }

  expect(Object.fromEntries([...offOriginRequests].map(([path, origins]) => [path, [...origins]]))).toEqual({});
});
