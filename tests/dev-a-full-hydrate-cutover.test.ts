import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

test('legacy full hydrate excludes BFF-managed Dev A tables', () => {
  const source = readFileSync(join(process.cwd(), 'lib/db/hydrate/full-hydrate.ts'), 'utf8');

  assert.match(source, /import \{ filterBffManagedTables \} from '\.\.\/bff-managed-tables'/);
  assert.match(source, /const legacyWave = filterBffManagedTables\(wave\)/);
  assert.match(source, /filterBffManagedTables\(SYNC_ARRAY_TABLES\)/);
});
