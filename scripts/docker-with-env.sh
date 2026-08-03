#!/bin/sh
# Resolve env file for Docker Compose / CI.
# Prefer shared mount on the deploy VM, then project .env.local.
#
# Override: ENV_FILE=/path/to/file  or  MNT_FDATA=/mnt/fdata
#
# Commands:
#   print   — print resolved ENV_FILE path (for CI)
#   build   — docker compose build
#   up      — build + run detached
#   deploy  — recreate containers from already-built image (no rebuild)
#   down    — stop and remove compose services
#   status  — show compose ps + matching images
set -eu

MNT_FDATA="${MNT_FDATA:-/mnt/fdata}"
# Normalize trailing slash from CI variables
MNT_FDATA="${MNT_FDATA%/}"
SHARED_ENV="${MNT_FDATA}/sharing/.env.local"
SHARED_ENV_ALT="${MNT_FDATA}/sharing/env.local"

# Stable project name so CI checkout path does not rename containers
export COMPOSE_PROJECT_NAME="${COMPOSE_PROJECT_NAME:-the-ant-adventures-crm}"

if [ -n "${ENV_FILE:-}" ]; then
  :
elif [ -f "$SHARED_ENV" ]; then
  ENV_FILE="$SHARED_ENV"
elif [ -f "$SHARED_ENV_ALT" ]; then
  ENV_FILE="$SHARED_ENV_ALT"
elif [ -f .env.local ]; then
  ENV_FILE=".env.local"
else
  echo "No env file found. Tried:" >&2
  echo "  ENV_FILE (unset)" >&2
  echo "  $SHARED_ENV" >&2
  echo "  $SHARED_ENV_ALT" >&2
  echo "  ./.env.local" >&2
  echo "Set ENV_FILE or place secrets at $SHARED_ENV" >&2
  exit 1
fi

if [ ! -f "$ENV_FILE" ]; then
  echo "ENV_FILE not found: $ENV_FILE" >&2
  exit 1
fi

export ENV_FILE

cmd="${1:-}"
if [ "$#" -gt 0 ]; then
  shift
fi

usage() {
  echo "Usage: $0 {print|build|up|deploy|down|status} [extra docker compose args...]" >&2
}

# Host port from ENV_FILE (APP_PORT=…) or default 3006 — matches docker-compose.yml
resolve_app_port() {
  port="${APP_PORT:-}"
  if [ -z "$port" ] && [ -f "$ENV_FILE" ]; then
    line=$(grep -E '^[[:space:]]*APP_PORT=' "$ENV_FILE" 2>/dev/null | tail -n 1 || true)
    if [ -n "$line" ]; then
      port=${line#*=}
      port=$(printf '%s' "$port" | tr -d '[:space:]"'"'")
    fi
  fi
  printf '%s\n' "${port:-3006}"
}

# Stop containers publishing host port (e.g. old compose project name still on :3006).
free_host_port() {
  port="$1"
  ids=$(docker ps --filter "publish=${port}" -q 2>/dev/null || true)
  if [ -n "$ids" ]; then
    echo "Port ${port}/tcp already in use — stopping container(s):"
    docker ps --filter "publish=${port}" --format 'table {{.ID}}\t{{.Names}}\t{{.Image}}\t{{.Ports}}'
    # shellcheck disable=SC2086
    docker stop $ids >/dev/null
    # shellcheck disable=SC2086
    docker rm $ids >/dev/null 2>&1 || true
    echo "Freed port ${port}."
  fi
}

case "$cmd" in
  build)
    echo "Using ENV_FILE=$ENV_FILE"
    exec docker compose --env-file "$ENV_FILE" build "$@"
    ;;
  up)
    echo "Using ENV_FILE=$ENV_FILE"
    APP_PORT_HOST=$(resolve_app_port)
    free_host_port "$APP_PORT_HOST"
    exec docker compose --env-file "$ENV_FILE" up --build -d "$@"
    ;;
  deploy)
    # After CI (or local) build: recreate from image without rebuilding
    echo "Deploying with ENV_FILE=$ENV_FILE (COMPOSE_PROJECT_NAME=$COMPOSE_PROJECT_NAME)"
    APP_PORT_HOST=$(resolve_app_port)
    free_host_port "$APP_PORT_HOST"
    exec docker compose --env-file "$ENV_FILE" up -d --no-build --force-recreate --remove-orphans "$@"
    ;;
  down)
    exec docker compose --env-file "$ENV_FILE" down "$@"
    ;;
  status)
    echo "ENV_FILE=$ENV_FILE COMPOSE_PROJECT_NAME=$COMPOSE_PROJECT_NAME"
    docker compose --env-file "$ENV_FILE" ps "$@"
    docker images --format 'table {{.Repository}}\t{{.Tag}}\t{{.ID}}\t{{.CreatedSince}}\t{{.Size}}' \
      | awk 'NR==1 || /the-ant-adventures-crm/'
    ;;
  print)
    # For CI: path only on stdout
    printf '%s\n' "$ENV_FILE"
    ;;
  "")
    usage
    exit 2
    ;;
  *)
    echo "Unknown command: $cmd" >&2
    usage
    exit 2
    ;;
esac
