import { expect, test } from '@playwright/test';
import { login, readE2eState } from './support';

test.setTimeout(90_000);

const devAPages = [
  '/products',
  '/pricing',
  '/pricing-essentials',
  '/pricing-accommodation',
  '/planner',
  '/attractions',
  '/tourdesign',
];

test('Dev A screens issue HTTP(S) requests only to the CRM origin', async ({ page, baseURL }) => {
  const state = await readE2eState();
  const crmOrigin = new URL(baseURL ?? 'http://localhost:3006').origin;
  const offOriginRequests = new Map<string, Set<string>>();
  const offOriginWebSockets = new Map<string, Set<string>>();
  let activePath = '/login';

  page.on('request', (request) => {
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
  for (const path of devAPages) {
    activePath = path;
    // `load` can wait on unrelated deferred assets. DOM readiness is enough to
    // observe every browser request initiated by this CRM screen.
    await page.goto(path, { waitUntil: 'domcontentloaded' });
    // Pricing catalog and route-level BFF callers can start after first paint.
    await page.waitForTimeout(1_500);
  }

  expect(Object.fromEntries([...offOriginRequests].map(([path, origins]) => [path, [...origins]]))).toEqual({});
  expect(Object.fromEntries([...offOriginWebSockets].map(([path, origins]) => [path, [...origins]]))).toEqual({});
});
