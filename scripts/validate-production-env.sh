#!/bin/sh
# Validate the generated production environment without printing secret values.
set -eu

ENV_FILE="${1:-}"
REQUIRE_BREAK_GLASS="${2:-}"

if [ -z "$ENV_FILE" ] || [ ! -f "$ENV_FILE" ]; then
  echo "Usage: $0 ENV_FILE [--require-break-glass]" >&2
  exit 2
fi

value_for() {
  sed -n "s/^$1=//p" "$ENV_FILE" | tail -n 1 | tr -d '\r'
}

missing=0
require_value() {
  if [ -z "$(value_for "$1")" ]; then
    echo "ERROR: Required production variable is missing: $1" >&2
    missing=1
  fi
}

for key in \
  NEXT_PUBLIC_SUPABASE_URL \
  NEXT_PUBLIC_SUPABASE_ANON_KEY \
  NEXT_PUBLIC_USE_SUPABASE \
  SUPABASE_SERVICE_ROLE_KEY \
  SUPABASE_DB_URL \
  CRM_SESSION_SECRET \
  REDIS_URL
do
  require_value "$key"
done

if [ "$(value_for NEXT_PUBLIC_USE_SUPABASE)" != "true" ]; then
  echo "ERROR: NEXT_PUBLIC_USE_SUPABASE must be true in production." >&2
  missing=1
fi

CRM_SESSION_SECRET_VALUE="$(value_for CRM_SESSION_SECRET)"
if [ -n "$CRM_SESSION_SECRET_VALUE" ] && [ "${#CRM_SESSION_SECRET_VALUE}" -lt 32 ]; then
  echo "ERROR: CRM_SESSION_SECRET must contain at least 32 characters." >&2
  missing=1
fi

if [ "$REQUIRE_BREAK_GLASS" = "--require-break-glass" ]; then
  for key in BREAK_GLASS_USERNAME BREAK_GLASS_PASSWORD BREAK_GLASS_SESSION_SECRET; do
    require_value "$key"
  done
  BREAK_GLASS_SESSION_SECRET_VALUE="$(value_for BREAK_GLASS_SESSION_SECRET)"
  if [ -n "$BREAK_GLASS_SESSION_SECRET_VALUE" ] \
    && [ "${#BREAK_GLASS_SESSION_SECRET_VALUE}" -lt 32 ]; then
    echo "ERROR: BREAK_GLASS_SESSION_SECRET must contain at least 32 characters." >&2
    missing=1
  fi
fi

if [ "$missing" -ne 0 ]; then
  echo "Production environment validation failed; deployment was not started." >&2
  exit 1
fi

echo "Production environment validation passed."
