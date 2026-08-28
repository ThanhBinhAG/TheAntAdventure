import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import test from 'node:test';

const root = process.cwd();

test('Dev 1 handoff documents the server-only auth boundary for domain routes', async () => {
  const handoff = await readFile(join(root, 'docs/BFF-DEV1-HANDOFF.md'), 'utf8');

  assert.match(handoff, /getAuthContext\(\)/);
  assert.match(handoff, /checkPermissionForRequest/);
  assert.match(handoff, /getServerSupabaseClient/);
  assert.match(handoff, /getAdminSupabaseClient/);
  assert.match(handoff, /bffRoute/);
  assert.match(handoff, /authenticationUnavailable/);
  assert.match(handoff, /503/);
  assert.match(handoff, /X-Request-ID/);
  assert.match(handoff, /must not[\s\S]*token|không[\s\S]*token/i);
});

test('final acceptance command keeps all local quality gates ordered and E2E opt-in', async () => {
  const [packageJson, script] = await Promise.all([
    readFile(join(root, 'package.json'), 'utf8'),
    readFile(join(root, 'scripts/final-acceptance.mjs'), 'utf8'),
  ]);
  const packageData = JSON.parse(packageJson) as { scripts: Record<string, string> };

  assert.equal(packageData.scripts['final:acceptance'], 'node scripts/final-acceptance.mjs');
  const commands = [
    'npm run lint',
    'npm run typecheck',
    'npm test',
    'npm run build',
    'npm run leakage:check',
  ];
  let previousIndex = -1;
  for (const command of commands) {
    assert.match(script, new RegExp(command.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    const commandIndex = script.indexOf(command);
    assert.ok(commandIndex > previousIndex, `${command} must follow the previous gate`);
    previousIndex = commandIndex;
  }
  assert.match(script, /FINAL_ACCEPTANCE_E2E/);
  assert.match(script, /npm run test:e2e/);
});

test('public Dev 1 auth contracts keep credentials request-local and server-only', async () => {
  const [session, permissions, supabase, route] = await Promise.all([
    readFile(join(root, 'lib/auth/session.ts'), 'utf8'),
    readFile(join(root, 'lib/auth/permissions-server.ts'), 'utf8'),
    readFile(join(root, 'lib/supabase/server.ts'), 'utf8'),
    readFile(join(root, 'lib/bff/route.ts'), 'utf8'),
  ]);

  assert.match(session, /const verifiedAccessTokens = new WeakMap<AuthContext, string>\(\)/);
  assert.doesNotMatch(session, /accessToken:\s*string/);
  assert.match(permissions, /export async function checkPermissionForRequest/);
  assert.match(permissions, /status: 401 \| 403/);
  assert.match(supabase, /export async function getServerSupabaseClient/);
  assert.match(supabase, /export function getAdminSupabaseClient/);
  assert.match(route, /authenticationUnavailable/);
  assert.match(route, /status: 503/);
  assert.match(route, /createHttpRequestLogger/);
});
