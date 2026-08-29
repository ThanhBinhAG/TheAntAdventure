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
#   deploy  — deploy from already-built image using the existing host-port upstream
#   local-up/local-deploy — use docker-compose.local.yml with loopback ports
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
  echo "Usage: $0 {print|build|up|deploy|down|status|local-up|local-deploy} [extra docker compose args...]" >&2
}

case "$cmd" in
  local-up)
    cmd="up"
    CRM_COMPOSE_FILE="docker-compose.local.yml"
    ;;
  local-deploy)
    cmd="deploy"
    CRM_COMPOSE_FILE="docker-compose.local.yml"
    ;;
esac

COMPOSE_FILE="${CRM_COMPOSE_FILE:-docker-compose.yml}"
if [ ! -f "$COMPOSE_FILE" ]; then
  echo "Compose file not found: $COMPOSE_FILE" >&2
  exit 1
fi

compose() {
  docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" "$@"
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

uniq_ids() {
  printf '%s\n' "$@" | tr ' ' '\n' | awk 'NF && !seen[$0]++'
}

# Container IDs that publish host port (filter + Ports column; Docker 29 filter can miss).
containers_on_port() {
  port="$1"
  ids=""
  ids="$ids $(docker ps -q --filter "publish=${port}" 2>/dev/null || true)"
  ids="$ids $(docker ps -q --filter "publish=${port}/tcp" 2>/dev/null || true)"
  # e.g. 0.0.0.0:3006->3006/tcp or :::3006->3006/tcp
  ids="$ids $(docker ps --format '{{.ID}} {{.Ports}}' 2>/dev/null \
    | grep -E "(^|[^0-9]):${port}->" \
    | awk '{print $1}' || true)"
  uniq_ids $ids
}

# CRM containers from this image or legacy compose project names.
crm_container_ids() {
  ids=""
  ids="$ids $(docker ps -aq --filter "ancestor=the-ant-adventures-crm:local" 2>/dev/null || true)"
  ids="$ids $(docker ps -aq --filter "ancestor=the-ant-adventures-crm:latest" 2>/dev/null || true)"
  ids="$ids $(docker ps -aq --filter "name=the-ant-adventures-crm" 2>/dev/null || true)"
  ids="$ids $(docker ps -aq --filter "name=crm-the-ants" 2>/dev/null || true)"
  uniq_ids $ids
}

diagnose_port() {
  port="$1"
  echo "--- diagnose host :${port} ---" >&2
  if command -v ss >/dev/null 2>&1; then
    ss -tlnp 2>/dev/null | grep -E ":${port}\\b" || echo "(ss: nothing matched)" >&2
  fi
  if command -v lsof >/dev/null 2>&1; then
    lsof -nP -iTCP:"${port}" -sTCP:LISTEN 2>/dev/null || true
  fi
  echo "docker ps (port column):" >&2
  docker ps --format 'table {{.ID}}\t{{.Names}}\t{{.Image}}\t{{.Ports}}' >&2 || true
  echo "--- end diagnose ---" >&2
}

port_is_free() {
  port="$1"
  if command -v ss >/dev/null 2>&1; then
    ! ss -tlnH 2>/dev/null | grep -qE ":${port}\\b"
    return $?
  fi
  # Fallback: no listener reported by docker publish parse
  ids=$(containers_on_port "$port")
  [ -z "$ids" ]
}

stop_ids() {
  ids="$1"
  if [ -z "$ids" ]; then
    return 0
  fi
  echo "Stopping container(s):"
  for id in $ids; do
    docker ps -a --filter "id=${id}" --format '  {{.ID}}  {{.Names}}  {{.Image}}  {{.Ports}}' 2>/dev/null || true
  done
  # shellcheck disable=SC2086
  docker stop $ids >/dev/null 2>&1 || true
  # shellcheck disable=SC2086
  docker rm -f $ids >/dev/null 2>&1 || true
}

# Free host port: compose down (caller), stop CRM + anything publishing the port.
free_host_port() {
  port="$1"
  echo "Freeing host port ${port}/tcp if needed..."

  on_port=$(containers_on_port "$port")
  crm=$(crm_container_ids)
  all=$(uniq_ids $on_port $crm)

  if [ -n "$all" ]; then
    stop_ids "$all"
    echo "Removed conflicting container(s)."
  else
    echo "No Docker containers matched port ${port} or CRM image/name."
  fi

  # Brief wait for docker-proxy / kernel to release the bind
  i=0
  while [ "$i" -lt 10 ]; do
    if port_is_free "$port"; then
      echo "Host port ${port} is free."
      return 0
    fi
    i=$((i + 1))
    sleep 1
  done

  echo "ERROR: host port ${port} is still in use after stopping Docker containers." >&2
  diagnose_port "$port"
  echo "Stop the non-Docker process (or set APP_PORT in the server env file) and re-run." >&2
  exit 1
}

case "$cmd" in
  build)
    echo "Using ENV_FILE=$ENV_FILE COMPOSE_FILE=$COMPOSE_FILE"
    compose build "$@"
    ;;
  up)
    echo "Using ENV_FILE=$ENV_FILE COMPOSE_FILE=$COMPOSE_FILE"
    compose down --remove-orphans >/dev/null 2>&1 || true
    APP_PORT_HOST=$(resolve_app_port)
    free_host_port "$APP_PORT_HOST"
    compose up --build -d "$@"
    ;;
  deploy)
    # Preserve the existing host-port upstream used by the externally managed
    # proxy. Production still uses shared_redis rather than the local profile.
    echo "Deploying with ENV_FILE=$ENV_FILE COMPOSE_FILE=$COMPOSE_FILE (COMPOSE_PROJECT_NAME=$COMPOSE_PROJECT_NAME)"
    compose down --remove-orphans || true
    APP_PORT_HOST=$(resolve_app_port)
    free_host_port "$APP_PORT_HOST"
    compose up -d --no-build --remove-orphans app "$@"
    ;;
  down)
    compose down "$@"
    ;;
  status)
    echo "ENV_FILE=$ENV_FILE COMPOSE_FILE=$COMPOSE_FILE COMPOSE_PROJECT_NAME=$COMPOSE_PROJECT_NAME"
    compose ps "$@"
    docker images --format 'table {{.Repository}}\t{{.Tag}}\t{{.ID}}\t{{.CreatedSince}}\t{{.Size}}' \
      | awk 'NR==1 || /the-ant-adventures-crm/'
    APP_PORT_HOST=$(resolve_app_port)
    echo "Host port ${APP_PORT_HOST}:"
    diagnose_port "$APP_PORT_HOST" 2>&1 || true
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
