import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { rowToTax } from '@/lib/db/mappers/finance';
import { BFF_MANAGED_TABLES } from '@/lib/db/bff-managed-tables';
import { ROUTE_CACHE_DENYLIST } from '@/lib/db/route-cache';
import { PAGE_BOOT_TABLES, SHELL_HYDRATE_TABLES } from '@/lib/db/sync-config';
import { buildTaxCsv, taxExportFilename } from '@/lib/tax/tax-export';

function source(path: string): string {
  return readFileSync(join(process.cwd(), path), 'utf8');
}

test('Tax page uses CRM BFF instead of browser hydrate', () => {
  const page = source('components/tax/TaxPage.tsx');
  const hook = source('hooks/useTaxPage.ts');

  assert.match(page, /useTaxPage/);
  assert.match(page, /\/api\/tax-reports\/export/);
  assert.doesNotMatch(page, /useStore\(\(s\) => s\.tax\)/);
  assert.doesNotMatch(page, /lib\/supabase\/client/);

  assert.match(hook, /getBffData/);
  assert.match(hook, /\/api\/tax-reports/);
  assert.match(hook, /withoutAutoSyncAsync/);
});

test('rowToTax maps generated VAT payable and profit columns', () => {
  const mapped = rowToTax({
    id: 'TAX-2026-001',
    period: 'Q1 2026',
    revenue: 1000,
    expenses: 400,
    vat_output: 100,
    vat_input: 40,
    vat_payable: 60,
    profit_before_tax: 600,
    corp_tax: 120,
  }) as Record<string, unknown>;

  assert.equal(mapped.vat_pay, 60);
  assert.equal(mapped.profit_bt, 600);
});

test('Tax API routes enforce tax.read / tax.write', () => {
  const listRoute = source('app/api/tax-reports/route.ts');
  const exportRoute = source('app/api/tax-reports/export/route.ts');
  assert.match(listRoute, /requiredPermission: 'tax\.read'/);
  assert.match(exportRoute, /requiredPermission: 'tax\.write'/);
  assert.match(source('lib/tax/tax-repository.ts'), /import 'server-only'/);
});

test('Tax export helper builds CSV filename and content', () => {
  assert.equal(taxExportFilename('all'), 'tax-report-ytd.csv');
  assert.equal(taxExportFilename('Q1 2026'), 'tax-report-Q1-2026.csv');
  const csv = buildTaxCsv([
    {
      id: 'TAX-2026-001',
      period: 'Q1 2026',
      rev: 1000,
      vat_out: 100,
      expenses: 400,
      vat_in: 40,
      vat_pay: 60,
      profit_bt: 600,
      corp_tax: 120,
    },
  ]);
  assert.match(csv, /TAX-2026-001/);
  assert.match(csv, /Q1 2026/);
});

test('Tax hydrate cutover: empty boot, denylist, no shell hydrate', () => {
  assert.equal((PAGE_BOOT_TABLES.tax ?? []).length, 0);
  assert.equal(BFF_MANAGED_TABLES.has('tax_reports'), true);
  assert.equal((SHELL_HYDRATE_TABLES as readonly string[]).includes('tax_reports'), false);
  assert.equal((ROUTE_CACHE_DENYLIST as readonly string[]).includes('tax_reports'), true);
});
