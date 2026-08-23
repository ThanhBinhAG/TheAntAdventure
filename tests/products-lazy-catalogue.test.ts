import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

test('products route reads only the Product selected for detail or editing', () => {
  const config = readFileSync(join(process.cwd(), 'lib/db/sync-config.ts'), 'utf8');
  const page = readFileSync(join(process.cwd(), 'components/products/ProductsPage.tsx'), 'utf8');

  assert.match(config, /products:\s*\[\]/);
  assert.doesNotMatch(page, /ensureTablesLoaded/);
  assert.match(page, /getBffData<Product>\(/);
  assert.match(page, /\/api\/products\?code=/);
  assert.doesNotMatch(page, /\/api\/products\/all/);
  assert.doesNotMatch(page, /\/api\/products\/pricing\/all/);
});
