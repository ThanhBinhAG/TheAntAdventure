#!/bin/sh
# Verify the deployed CRM has no host port and can reach only its private dependencies.
set -eu

ENV_FILE="${1:-}"
if [ -z "$ENV_FILE" ] || [ ! -f "$ENV_FILE" ]; then
  echo "Usage: $0 DEPLOY_ENV_FILE" >&2
  exit 2
fi

APP_ID="$(docker compose --env-file "$ENV_FILE" ps -q app)"
if [ -z "$APP_ID" ]; then
  echo "ERROR: CRM app container was not found." >&2
  exit 1
fi

PORT_BINDINGS="$(docker inspect --format '{{json .HostConfig.PortBindings}}' "$APP_ID")"
if [ "$PORT_BINDINGS" != "null" ] && [ "$PORT_BINDINGS" != "{}" ]; then
  echo "ERROR: CRM container has a host port binding." >&2
  exit 1
fi

CRM_PROXY_NETWORK="${CRM_PROXY_NETWORK:-reverse-proxy}"
NETWORKS="$(docker inspect --format '{{range $name, $_ := .NetworkSettings.Networks}}{{$name}} {{end}}' "$APP_ID")"
case " $NETWORKS " in
  *" $CRM_PROXY_NETWORK "*) ;;
  *)
    echo "ERROR: CRM container is not connected to the reverse-proxy network." >&2
    exit 1
    ;;
esac

docker exec "$APP_ID" node - <<'NODE'
const dns = require('node:dns').promises;
const net = require('node:net');

const supabaseUrl = new URL(process.env.SUPABASE_URL ?? '');
const redisUrl = new URL(process.env.REDIS_URL ?? '');
if (supabaseUrl.host !== 'supabase-ant-crm-gateway:8000') throw new Error('Unexpected private Supabase gateway URL.');

const connect = (host, port) => new Promise((resolve, reject) => {
  const socket = net.connect({ host, port });
  socket.setTimeout(5_000);
  socket.once('connect', () => { socket.destroy(); resolve(); });
  socket.once('timeout', () => { socket.destroy(); reject(new Error(`Timed out connecting to ${host}:${port}`)); });
  socket.once('error', reject);
});

(async () => {
  await dns.lookup(supabaseUrl.hostname);
  await dns.lookup(redisUrl.hostname);
  const gateway = await fetch(`${supabaseUrl.origin}/auth/v1/health`, {
    headers: { apikey: process.env.SUPABASE_ANON_KEY ?? '' },
    signal: AbortSignal.timeout(8_000),
  });
  if (!gateway.ok) throw new Error(`Supabase gateway health returned ${gateway.status}.`);
  await connect(redisUrl.hostname, Number(redisUrl.port || 6379));
  const health = await fetch('http://127.0.0.1:3006/api/health', { signal: AbortSignal.timeout(8_000) });
  if (!health.ok) throw new Error(`CRM health returned ${health.status}.`);
  console.log('Private dependency verification passed.');
})().catch((error) => { console.error(error.message); process.exitCode = 1; });
NODE
