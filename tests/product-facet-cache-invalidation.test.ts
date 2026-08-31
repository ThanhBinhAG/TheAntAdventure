import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

test('product facets invalidate via CRM BFF client helper', () => {
  const facetsClient = readFileSync(join(process.cwd(), 'lib/products/product-facets-client.ts'), 'utf8');
  assert.match(facetsClient, /invalidateProductFacetsFromClient/);
  assert.match(facetsClient, /fetch\('\/api\/products'/);
});
