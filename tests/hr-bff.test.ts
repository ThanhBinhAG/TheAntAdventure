import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { BFF_MANAGED_TABLES } from '@/lib/db/bff-managed-tables';

function source(path: string): string {
  return readFileSync(join(process.cwd(), path), 'utf8');
}

test('HR page uses CRM BFF instead of browser hydrate', () => {
  const page = source('components/hr/HrPage.tsx');
  const hook = source('hooks/useHrPage.ts');

  assert.match(page, /useHrPage/);
  assert.doesNotMatch(page, /useStore\(\(s\) => s\.staff\)/);
  assert.doesNotMatch(page, /lib\/supabase\/client/);

  assert.match(hook, /getBffArray/);
  assert.match(hook, /\/api\/hr/);
  assert.match(hook, /withoutAutoSyncAsync/);
});

test('HR API route enforces hr.read and DTO excludes salary fields', () => {
  const route = source('app/api/hr/route.ts');
  const repo = source('lib/hr/hr-repository.ts');
  const input = source('lib/hr/hr-input.ts');
  assert.match(route, /requiredPermission: 'hr\.read'/);
  assert.match(repo, /import 'server-only'/);
  assert.doesNotMatch(input, /baseSalary/);
  assert.doesNotMatch(repo, /baseSalary/);
});

test('hr-bff tables are BFF-managed', () => {
  assert.equal(BFF_MANAGED_TABLES.has('staff'), true);
});

