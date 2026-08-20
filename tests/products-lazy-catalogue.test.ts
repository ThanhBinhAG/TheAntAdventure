import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

test('products route defers the full catalogue until detail or manage is needed', () => {
  const config = readFileSync(join(process.cwd(), 'lib/db/sync-config.ts'), 'utf8');
  const page = readFileSync(join(process.cwd(), 'components/products/ProductsPage.tsx'), 'utf8');

  assert.match(config, /products:\s*\[\]/);
  assert.match(page, /ensureTablesLoaded\(\['products', 'product_pricing'\]\)/);
});
