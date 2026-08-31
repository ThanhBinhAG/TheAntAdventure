import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

test('products route reads only the Product selected for detail or editing', () => {
  const page = readFileSync(join(process.cwd(), 'components/products/ProductsPage.tsx'), 'utf8');

  assert.doesNotMatch(page, /ensureTablesLoaded|lib\/db\/hydrate/);
  assert.match(page, /getBffData<Product>\(/);
  assert.match(page, /\/api\/products\?code=/);
  assert.doesNotMatch(page, /\/api\/products\/all/);
  assert.doesNotMatch(page, /\/api\/products\/pricing\/all/);
});
