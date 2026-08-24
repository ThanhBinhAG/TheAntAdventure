import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { dashboardQuerySchema } from '@/lib/dashboard/dashboard-input';

function source(path: string) {
  return readFileSync(join(process.cwd(), path), 'utf8');
}

test('dashboard query accepts empty filters and b2b/market', () => {
  const empty = dashboardQuerySchema.safeParse({});
  assert.equal(empty.success, true);
  if (empty.success) {
    assert.equal(empty.data.clientType, '');
    assert.equal(empty.data.market, '');
  }

  const ok = dashboardQuerySchema.safeParse({
    clientType: 'b2b',
    market: 'USA',
  });
  assert.equal(ok.success, true);

  const bad = dashboardQuerySchema.safeParse({ clientType: 'enterprise' });
  assert.equal(bad.success, false);
});

test('Dashboard BFF cutover: API hook and empty boot', () => {
  const syncConfig = source('lib/db/sync-config.ts');
  const page = source('components/dashboard/DashboardPage.tsx');
  const hook = source('hooks/useDashboardPage.ts');
  const api = source('app/api/dashboard/route.ts');
  const forecast = source('components/dashboard/DashboardForecast.tsx');
  const leadRepo = source('lib/sales/lead-repository.ts');

  assert.match(syncConfig, /dashboard:\s*\[\]/);
  assert.match(hook, /\/api\/dashboard/);
  assert.match(hook, /fetchDashboardOnce/);
  assert.match(page, /useDashboardPage/);
  assert.doesNotMatch(page, /useStore\s*\(\s*\(s\)\s*=>\s*s\.leads/);
  assert.doesNotMatch(page, /useStore\s*\(\s*\(s\)\s*=>\s*s\.bookings/);
  assert.doesNotMatch(page, /computeDashboardMetrics/);
  assert.match(api, /dashboard\.read/);
  assert.match(forecast, /DashboardForecastDeal/);
  assert.match(leadRepo, /invalidateDashboardCache/);
});
