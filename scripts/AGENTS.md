# scripts/ — Agent overview

## Role
Ops shell helpers (not npm package scripts). Separate from `Personal/scripts` one-offs.

## Contents
- `cron-refresh-weather.sh` — weather cache refresh
- `setup-pdf-deps-wsl.sh` — WSL PDF dependency setup

## Boundaries
- App domain logic stays in `lib/`. Legacy migrate tools: `Personal/scripts`.
