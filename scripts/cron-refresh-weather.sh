#!/usr/bin/env bash
# Refresh weekly weather cache via CRM API.
# Usage: set APP_URL and WEATHER_CRON_SECRET in env, then run or schedule via crontab.
#
# Example crontab (6:00 AM Vietnam, server TZ = Asia/Ho_Chi_Minh):
#   0 6 * * * /path/to/TheAntAdventure/scripts/cron-refresh-weather.sh >> /var/log/weather-refresh.log 2>&1

set -euo pipefail

APP_URL="${APP_URL:-http://localhost:3006}"
SECRET="${WEATHER_CRON_SECRET:-}"

if [[ -z "$SECRET" ]]; then
  echo "ERROR: WEATHER_CRON_SECRET is not set" >&2
  exit 1
fi

echo "[$(date -Iseconds)] Refreshing weather cache at ${APP_URL}/api/weather/refresh"

curl -sf -X POST "${APP_URL}/api/weather/refresh" \
  -H "Authorization: Bearer ${SECRET}" \
  -H "Content-Type: application/json" \
  -d '{"force":false}'

echo ""
echo "[$(date -Iseconds)] Done"
