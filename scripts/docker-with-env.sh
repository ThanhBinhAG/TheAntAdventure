#!/bin/sh
# Resolve env file for Docker Compose / CI.
# Prefer shared mount on the deploy VM, then project .env.local.
#
# Override: ENV_FILE=/path/to/file  or  MNT_FDATA=/mnt/fdata
set -eu

MNT_FDATA="${MNT_FDATA:-/mnt/fdata}"
SHARED_ENV="${MNT_FDATA}/sharing/.env.local"
SHARED_ENV_ALT="${MNT_FDATA}/sharing/env.local"

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

case "$cmd" in
  build)
    echo "Using ENV_FILE=$ENV_FILE"
    exec docker compose --env-file "$ENV_FILE" build "$@"
    ;;
  up)
    echo "Using ENV_FILE=$ENV_FILE"
    exec docker compose --env-file "$ENV_FILE" up --build -d "$@"
    ;;
  down)
    exec docker compose down "$@"
    ;;
  print)
    # For CI: path only on stdout
    printf '%s\n' "$ENV_FILE"
    ;;
  "")
    echo "Usage: $0 {build|up|down|print} [extra docker compose args...]" >&2
    exit 2
    ;;
  *)
    echo "Unknown command: $cmd" >&2
    echo "Usage: $0 {build|up|down|print} [extra docker compose args...]" >&2
    exit 2
    ;;
esac
