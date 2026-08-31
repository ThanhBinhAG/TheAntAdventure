import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { BFF_MANAGED_TABLES } from '@/lib/db/bff-managed-tables';

function source(path: string): string {
  return readFileSync(join(process.cwd(), path), 'utf8');
}

test('Salary page uses CRM BFF instead of browser hydrate', () => {
  const page = source('components/salary/SalaryPage.tsx');
  const hook = source('hooks/useSalaryPage.ts');

  assert.match(page, /useSalaryPage/);
  assert.doesNotMatch(page, /useStore\(\(s\) => s\.staff\)/);
  assert.doesNotMatch(page, /lib\/supabase\/client/);

  assert.match(hook, /getBffArray/);
  assert.match(hook, /\/api\/salary/);
  assert.match(hook, /withoutAutoSyncAsync/);
});

test('Salary API route enforces salary.read and includes baseSalary DTO', () => {
  const route = source('app/api/salary/route.ts');
  const repo = source('lib/salary/salary-repository.ts');
  assert.match(route, /requiredPermission: 'salary\.read'/);
  assert.match(repo, /import 'server-only'/);
  assert.match(repo, /baseSalary/);
});

test('salary-bff tables are BFF-managed', () => {
  assert.equal(BFF_MANAGED_TABLES.has('staff'), true);
});

