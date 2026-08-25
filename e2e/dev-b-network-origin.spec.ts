import { expect, test } from '@playwright/test';
import { login, readE2eState } from './support';

/** Dev B BFF screens — Fetch/XHR only (Storage CDN `<img>` is out of scope). */
const devBPages = [
  '/dashboard',
  '/customers',
  '/agents',
  '/sales',
  '/gallery',
  '/weather',
];

test('Dev B screens issue Fetch/XHR only to the CRM origin', async ({ page, baseURL }) => {
  const state = await readE2eState();
  const crmOrigin = new URL(baseURL ?? 'http://localhost:3006').origin;
  const offOriginRequests = new Map<string, Set<string>>();
  let activePath = '/login';

  page.on('request', (request) => {
    const type = request.resourceType();
    if (type !== 'fetch' && type !== 'xhr') return;
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
  for (const path of devBPages) {
    activePath = path;
    await page.goto(path);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);
  }

  expect(Object.fromEntries([...offOriginRequests].map(([path, origins]) => [path, [...origins]]))).toEqual({});
});
