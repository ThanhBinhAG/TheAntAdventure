#!/usr/bin/env bash
# Supabase CLI helpers — load SUPABASE_DB_URL from .env.local and run db commands.
# Usage:
#   bash scripts/supabase-db.sh push
#   bash scripts/supabase-db.sh pull
#   bash scripts/supabase-db.sh status
#   bash scripts/supabase-db.sh repair-applied 20260101000000
#   bash scripts/supabase-db.sh link --project-ref YOUR_REF
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

load_env() {
  if [[ -f .env.local ]]; then
    set -a
    # shellcheck disable=SC1091
    source .env.local
    set +a
  fi
}

require_db_url() {
  if [[ -z "${SUPABASE_DB_URL:-}" ]]; then
    echo "SUPABASE_DB_URL is not set. Add it to .env.local (see .env.example)." >&2
    exit 1
  fi
}

run_cli() {
  npx supabase "$@"
}

load_env

cmd="${1:-}"
shift || true

case "$cmd" in
  push)
    require_db_url
    run_cli db push --db-url "$SUPABASE_DB_URL" "$@"
    ;;
  pull)
    require_db_url
    run_cli db pull "$@" --db-url "$SUPABASE_DB_URL"
    ;;
  status)
    if [[ -n "${SUPABASE_DB_URL:-}" ]]; then
      run_cli migration list --db-url "$SUPABASE_DB_URL" "$@"
    else
      run_cli migration list "$@"
    fi
    ;;
  repair-applied)
    require_db_url
    version="${1:-}"
    if [[ -z "$version" ]]; then
      echo "Usage: bash scripts/supabase-db.sh repair-applied TIMESTAMP" >&2
      exit 1
    fi
    run_cli migration repair --status applied "$version" --db-url "$SUPABASE_DB_URL"
    ;;
  link)
    run_cli link "$@"
    ;;
  login)
    run_cli login "$@"
    ;;
  new)
    name="${1:-}"
    if [[ -z "$name" ]]; then
      echo "Usage: bash scripts/supabase-db.sh new migration_name" >&2
      exit 1
    fi
    run_cli migration new "$name"
    ;;
  bootstrap-existing)
    # Mark baseline + pre-CLI incremental migrations as already applied on remote.
    require_db_url
    for v in 20260101000000 20260711 20260713; do
      echo "Marking migration $v as applied..."
      run_cli migration repair --status applied "$v" --db-url "$SUPABASE_DB_URL" || true
    done
    run_cli migration list --db-url "$SUPABASE_DB_URL"
    ;;
  *)
    cat <<'EOF'
Supabase DB helper

Commands:
  push                 Apply pending migrations (needs SUPABASE_DB_URL)
  pull [name]          Pull remote schema into a new migration file
  status               List local vs remote migration history
  repair-applied TS    Mark migration TIMESTAMP as applied on remote
  bootstrap-existing   Repair baseline + 20260711 + 20260713 on existing DB
  link [flags]         supabase link (Supabase Cloud or self-hosted project ref)
  login                supabase login (Supabase Cloud access token)
  new NAME             Create supabase/migrations/<timestamp>_NAME.sql

Set in .env.local:
  SUPABASE_DB_URL=postgresql://postgres:PASSWORD@HOST:5432/postgres
  SUPABASE_PROJECT_REF=...   (optional, for supabase link)
EOF
    exit 1
    ;;
esac
