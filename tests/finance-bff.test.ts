import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { BFF_MANAGED_TABLES } from '@/lib/db/bff-managed-tables';

function source(path: string): string {
  return readFileSync(join(process.cwd(), path), 'utf8');
}

test('Finance page uses CRM BFF instead of browser hydrate', () => {
  const page = source('components/finance/FinancePage.tsx');
  const hook = source('hooks/useFinancePage.ts');

  assert.match(page, /useFinancePage/);
  assert.doesNotMatch(page, /useStore\(\(s\) => s\.finance\)/);
  assert.doesNotMatch(page, /lib\/supabase\/client/);

  assert.match(hook, /getBffData/);
  assert.match(hook, /\/api\/finance/);
  assert.match(hook, /withoutAutoSyncAsync/);
  assert.match(hook, /setFinance/);
  assert.match(hook, /setAr/);
  assert.match(hook, /setAp/);
});

test('Finance API routes enforce finance.read', () => {
  const route = source('app/api/finance/route.ts');
  assert.match(route, /requiredPermission: 'finance\.read'/);
  assert.match(route, /listFinanceBundleServer/);
  assert.match(source('lib/finance/finance-repository.ts'), /import 'server-only'/);
});

test('finance-bff tables are BFF-managed', () => {
  assert.equal(BFF_MANAGED_TABLES.has('finance'), true);
  assert.equal(BFF_MANAGED_TABLES.has('accounts_receivable'), true);
  assert.equal(BFF_MANAGED_TABLES.has('accounts_payable'), true);
});

