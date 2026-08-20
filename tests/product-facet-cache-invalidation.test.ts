import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

test('product and pricing writes invalidate cached Product facets after remote success', () => {
  const syncPush = readFileSync(join(process.cwd(), 'lib/db/sync-push.ts'), 'utf8');
  const remoteDelete = readFileSync(join(process.cwd(), 'lib/db/remote-delete.ts'), 'utf8');

  assert.match(syncPush, /invalidateProductFacetsFromClient/);
  assert.match(
    syncPush,
    /target\.includes\('products'\) \|\| target\.includes\('product_pricing'\)/
  );

  assert.match(remoteDelete, /await db\.products\.deleteRemote\(code\);\s+await invalidateProductFacetsFromClient\(\);/);
  assert.match(
    remoteDelete,
    /await db\.product_pricing\.deleteRemote\(productCode\);\s+await invalidateProductFacetsFromClient\(\);/
  );
});
