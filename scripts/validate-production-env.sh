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

if [ "$(value_for NEXT_PUBLIC_USE_SUPABASE)" != "true" ]; then
  echo "ERROR: NEXT_PUBLIC_USE_SUPABASE must be true in production." >&2
  missing=1
fi

CRM_SESSION_SECRET_VALUE="$(value_for CRM_SESSION_SECRET)"
if [ -n "$CRM_SESSION_SECRET_VALUE" ] && [ "${#CRM_SESSION_SECRET_VALUE}" -lt 32 ]; then
  echo "ERROR: CRM_SESSION_SECRET must contain at least 32 characters." >&2
  missing=1
fi

BREAK_GLASS_SESSION_SECRET_VALUE="$(value_for BREAK_GLASS_SESSION_SECRET)"
if [ -n "$BREAK_GLASS_SESSION_SECRET_VALUE" ] \
  && [ "${#BREAK_GLASS_SESSION_SECRET_VALUE}" -lt 32 ]; then
  echo "ERROR: BREAK_GLASS_SESSION_SECRET must contain at least 32 characters." >&2
  missing=1
fi

if [ "$missing" -ne 0 ]; then
  echo "Production environment validation failed; deployment was not started." >&2
  exit 1
fi

echo "Production environment validation passed."
