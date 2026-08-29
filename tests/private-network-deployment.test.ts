import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import test from 'node:test';

test('production Compose retains the existing host-port CRM upstream without owning proxy topology', async () => {
  const compose = await readFile(join(process.cwd(), 'docker-compose.yml'), 'utf8');
  const app = compose.slice(compose.indexOf('  app:'), compose.indexOf('\n  redis:'));

  assert.match(app, /ports:\n\s+- "\$\{APP_PORT:-3006\}:3006"/);
  assert.doesNotMatch(app, /expose:\n\s+- "3006"/);
  assert.doesNotMatch(app, /- crm_proxy/);
  assert.doesNotMatch(compose, /CRM_PROXY_NETWORK/);
});

test('deployment scripts invoke Docker Compose directly and validation requires private dependencies', async () => {
  const [localCompose, dockerScript, validator, verifier, pipeline] = await Promise.all([
    readFile(join(process.cwd(), 'docker-compose.local.yml'), 'utf8'),
    readFile(join(process.cwd(), 'scripts/docker-with-env.sh'), 'utf8'),
    readFile(join(process.cwd(), 'scripts/validate-production-env.sh'), 'utf8'),
    readFile(join(process.cwd(), 'scripts/verify-private-network.sh'), 'utf8'),
    readFile(join(process.cwd(), '.gitlab-ci.yml'), 'utf8'),
  ]);

  assert.match(localCompose, /\$\{APP_PORT:-3006\}:3006/);
  assert.match(localCompose, /127\.0\.0\.1:6379:6379/);
  assert.doesNotMatch(dockerScript, /exec compose\b/);
  assert.match(
    dockerScript,
    /exec docker compose -f "\$COMPOSE_FILE" --env-file "\$ENV_FILE" build/,
  );
  assert.match(validator, /REQUIRE_PRIVATE_NETWORK/);
  assert.match(validator, /supabase-ant-crm-gateway:8000/);
  assert.match(verifier, /SUPABASE_URL/);
  assert.match(verifier, /REDIS_URL/);
  assert.doesNotMatch(verifier, /HostConfig\.PortBindings/);
  assert.doesNotMatch(verifier, /CRM_PROXY_NETWORK/);
  assert.match(pipeline, /REQUIRE_PRIVATE_NETWORK=1 sh scripts\/validate-production-env\.sh/);
  assert.match(pipeline, /sh scripts\/verify-private-network\.sh "\$DEPLOY_ENV_FILE"/);
});
