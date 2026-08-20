import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

test('Modules View renders server pages without client pagination', () => {
  const source = readFileSync(join(process.cwd(), 'components/products/ModulesView.tsx'), 'utf8');
  assert.match(source, /useProductPage\(/);
  assert.doesNotMatch(source, /usePagination\(/);
  assert.doesNotMatch(source, /useEffect\(\(\) => \{\s*setPage\(1\)/);
});
