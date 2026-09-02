import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

test('Customer form declares Travel Style hooks before its closed-modal return', () => {
  const source = readFileSync(join(process.cwd(), 'components/customers/CustomerFormModal.tsx'), 'utf8');
  const memo = source.indexOf('const selectableTravelStyles = useMemo');
  const closedReturn = source.indexOf('if (!open) return null;');

  assert.ok(memo >= 0, 'Travel Style selectable options must remain memoized');
  assert.ok(memo < closedReturn, 'all hooks must be declared before the closed-modal return');
});
