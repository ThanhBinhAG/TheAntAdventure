import { expect, test } from '@playwright/test';
import { login, readE2eState } from './support';

test.setTimeout(90_000);

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
  const offOriginWebSockets = new Map<string, Set<string>>();
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
  page.on('websocket', (webSocket) => {
    const url = new URL(webSocket.url());
    const expectedProtocol = crmOrigin.startsWith('https:') ? 'wss:' : 'ws:';
    if (url.protocol !== expectedProtocol || url.host !== new URL(crmOrigin).host) {
      const origins = offOriginWebSockets.get(activePath) ?? new Set<string>();
      origins.add(webSocket.url());
      offOriginWebSockets.set(activePath, origins);
    }
  });

  await login(page, state.admin);
  // Let the legacy dashboard boot finish so only each target page is audited below.
  await page.waitForTimeout(3_000);
  offOriginRequests.clear();
  for (const path of devBPages) {
    activePath = path;
    await page.goto(path, { waitUntil: 'domcontentloaded' });
    // Keep the capture open long enough to observe deferred BFF requests.
    await page.waitForTimeout(1_500);
  }

  expect(Object.fromEntries([...offOriginRequests].map(([path, origins]) => [path, [...origins]]))).toEqual({});
  expect(Object.fromEntries([...offOriginWebSockets].map(([path, origins]) => [path, [...origins]]))).toEqual({});
});
