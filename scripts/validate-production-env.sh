#!/bin/sh
# Validate the generated production environment without printing secret values.
# Required variables are declared in .env.example with `# CI_REQUIRED`.
set -eu

ENV_FILE="${1:-}"
ENV_EXAMPLE="${2:-.env.example}"

if [ -z "$ENV_FILE" ] || [ ! -f "$ENV_FILE" ] || [ ! -f "$ENV_EXAMPLE" ]; then
  echo "Usage: $0 ENV_FILE [ENV_EXAMPLE]" >&2
  exit 2
fi

value_for() {
  sed -n "s/^$1=//p" "$ENV_FILE" | tail -n 1 | tr -d '\r'
}

# A marker applies to the next assignment, including a commented assignment.
# Optional variables remain documented without preventing a production deploy.
required_template_keys() {
  awk '
    /^[[:space:]]*#[[:space:]]*CI_REQUIRED[[:space:]]*$/ {
      required = 1
      next
    }
    /^[[:space:]]*#?[[:space:]]*[A-Za-z_][A-Za-z0-9_]*=/ {
      line = $0
      sub(/^[[:space:]]*/, "", line)
      sub(/^#[[:space:]]*/, "", line)
      key = line
      sub(/=.*/, "", key)
      if (required) print key
      required = 0
    }
  ' "$ENV_EXAMPLE"
}

missing=0
for key in $(required_template_keys); do
  if [ -z "$(value_for "$key")" ]; then
    echo "ERROR: Required production variable is missing: $key" >&2
    missing=1
  fi
done

if [ "$missing" -ne 0 ]; then
  echo "Production environment validation failed; deployment was not started." >&2
  exit 1
fi

# The production Compose topology is private-only. Enable this check from the
# deploy job; local development deliberately uses different endpoints.
if [ "${REQUIRE_PRIVATE_NETWORK:-0}" = "1" ]; then
  supabase_url="$(value_for SUPABASE_URL)"
  redis_url="$(value_for REDIS_URL)"
  if [ "$supabase_url" != "http://supabase-ant-crm-gateway:8000" ]; then
    echo "ERROR: Private deployment must use SUPABASE_URL=http://supabase-ant-crm-gateway:8000." >&2
    exit 1
  fi
  case "$redis_url" in
    *localhost*|*127.0.0.1*|*0.0.0.0*)
      echo "ERROR: Private deployment must not use a host-local REDIS_URL." >&2
      exit 1
      ;;
  esac
fi

echo "Production environment validation passed."
