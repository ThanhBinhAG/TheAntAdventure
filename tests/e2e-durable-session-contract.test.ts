import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import test from 'node:test';

test('browser E2E asserts the opaque CRM session cookie, never the retired Supabase cookie', async () => {
  const [support, spec] = await Promise.all([
    readFile(join(process.cwd(), 'e2e/support.ts'), 'utf8'),
    readFile(join(process.cwd(), 'e2e/auth-session.spec.ts'), 'utf8'),
  ]);

  assert.match(support, /CRM_SESSION_COOKIE = 'crm_session'/);
  assert.doesNotMatch(`${support}\n${spec}`, /sb-crm-access-token|Supabase access cookie/);
  assert.match(spec, /opaque CRM session cookie/);
});
