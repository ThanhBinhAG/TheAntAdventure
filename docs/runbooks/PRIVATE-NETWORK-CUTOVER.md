# CRM deployment and private-dependency runbook

## Scope and prerequisites

This runbook preserves the CRM host-port upstream (`${APP_PORT:-3006}:3006`) used
by the existing ingress/proxy. Proxy configuration is operated outside this
repository and is not created, changed, or verified by these commands. Supabase
gateway and `shared_redis` must be reachable from the CRM private networks.

Do not run these steps against a production database until
`20260827104813_durable_crm_sessions_v2.sql` has been reviewed and backed up.

## Preflight

1. Confirm the existing ingress/proxy continues to route to the configured
   `APP_PORT` (default `3006`). This deployment does not modify that proxy.
2. Confirm the deployment environment has `SUPABASE_URL` set to
   `http://supabase-ant-crm-gateway:8000` and `REDIS_URL` points to an internal
   Redis hostname, never `localhost` or `127.0.0.1`.
3. Back up the Supabase Postgres database using the operator-approved procedure
   and record the backup location and restore command outside this repository.
4. Run the local quality gates: `npm run lint`, `npm run typecheck`, `npm test`,
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

   The CRM app is expected to show `${APP_PORT:-3006}:3006`. Confirm separately
   that Redis, Supabase services, and Postgres have only the host mappings
   approved by Ops.
3. From the CRM container, re-run the deploy verifier if necessary:

   ```bash
   sh scripts/verify-private-network.sh /path/to/deploy.env
   ```

4. Confirm the normal CRM URL works and that `supabase-ant-crm-gateway` does not
   resolve or accept a connection from an external workstation.

## Rollback

The GitLab deploy job records the previous CRM image and automatically retags it
when the new app becomes unhealthy. For a manual rollback, use the previous image
recorded by the job and run the standard deploy script; do not restore a database
backup merely to roll back an application image.

If a migration is implicated, stop and use the migration-specific recovery plan.
Supabase schema migrations are not automatically reversible.

## Recovery

### Restore database

1. Stop CRM writes using the team-approved maintenance procedure.
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
