# Private-network cutover runbook

## Scope and prerequisites

This runbook deploys the CRM without a host port. The external reverse proxy is
the sole public ingress and must already be attached to the Docker network named
by `CRM_PROXY_NETWORK` (default: `reverse-proxy`). Supabase gateway and
`shared_redis` must be reachable from the CRM private networks.

Do not run these steps against a production database until
`20260827104813_durable_crm_sessions_v2.sql` has been reviewed and backed up.

## Preflight

1. Create or identify the external reverse-proxy network and attach the proxy
   container to it. Do not expose CRM port `3006` from the proxy's network.
2. Set `CRM_PROXY_NETWORK` in the deployment environment if its network name is
   not `reverse-proxy`.
3. Confirm the deployment environment has `SUPABASE_URL` set to
   `http://supabase-ant-crm-gateway:8000` and `REDIS_URL` points to an internal
   Redis hostname, never `localhost` or `127.0.0.1`.
4. Back up the Supabase Postgres database using the operator-approved procedure
   and record the backup location and restore command outside this repository.
5. Run the local quality gates: `npm run lint`, `npm run typecheck`, `npm test`,
   and `npm run build`.

## Deploy and verify

1. Run the normal main-branch GitLab deployment. It validates private runtime
   dependencies before build, applies pending migrations, waits for CRM health,
   then runs `scripts/verify-private-network.sh` inside the deployed container.
2. On the host, inspect the full stack:

   ```bash
   docker compose --env-file /path/to/deploy.env ps
   docker ps --format 'table {{.Names}}\t{{.Ports}}'
   ```

   Only the reverse proxy may show `80` or `443`; the CRM app, Redis, Supabase
   services, and Postgres must show no host mapping.
3. From the CRM container, re-run the deploy verifier if necessary:

   ```bash
   sh scripts/verify-private-network.sh /path/to/deploy.env
   ```

4. From an external workstation, confirm the public CRM URL works over HTTPS and
   that `supabase-ant-crm-gateway` does not resolve or accept a connection.

## Rollback

The GitLab deploy job records the previous CRM image and automatically retags it
when the new app becomes unhealthy. For a manual rollback, use the previous image
recorded by the job and run the standard deploy script; do not restore a database
backup merely to roll back an application image.

If a migration is implicated, stop and use the migration-specific recovery plan.
Supabase schema migrations are not automatically reversible.

## Recovery

### Restore database

1. Stop CRM writes or place the reverse proxy in maintenance mode.
2. Restore only from the approved, timestamped Supabase Postgres backup.
3. Run health and auth smoke tests before re-enabling public traffic.

### Redis flush

Redis is an optional cache and rate-limit store, not durable CRM-session truth.
Flush only the CRM-assigned logical database, never every shared Redis database.
After a flush, expect cache misses and temporary rate-limit reset; durable CRM
sessions remain in Postgres.

## Key rotation

After Dev 2 removes browser leakage and `npm run leakage:check` passes, rotate
the Supabase anon key through the secret manager and redeploy. Review image layers,
CI logs, and deployment history before deciding whether the service-role key was
ever exposed; rotate it immediately if evidence exists. Rotating
`SESSION_ENCRYPTION_KEY` invalidates all durable CRM sessions and must be treated
as a deliberate security response.
