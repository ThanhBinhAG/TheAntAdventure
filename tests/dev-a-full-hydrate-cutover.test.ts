import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

test('legacy browser full-hydrate module removed (D2.13)', () => {
  assert.equal(existsSync(join(process.cwd(), 'lib/db/hydrate/full-hydrate.ts')), false);
});
