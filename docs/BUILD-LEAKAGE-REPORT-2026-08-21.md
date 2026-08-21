# Build And Leakage Report - 2026-08-21

## Result

| Check | Result | Evidence |
| --- | --- | --- |
| `npm ls @sparticuz/chromium --depth=0` | Pass | `@sparticuz/chromium@149.0.0` is valid |
| `next build --webpack` | Pass | Production `.next/static` assets were produced |
| `npm run leakage:check` | Fail | Browser bundle contains configured Supabase URL and publishable key |

## Dependency Recovery

The prior `node_modules` tree contained incomplete npm temporary directories, so npm marked Chromium invalid. The dependency tree was rebuilt from the committed `package-lock.json` using `npm ci`; no dependency version or lockfile change was needed.

## Leakage Finding

The scanner found `http://127.0.0.1:54321` and the configured Supabase publishable key in browser assets. The values reach the client through remaining legacy browser-Supabase paths, including `components/guides/GuidesPage.tsx`, `lib/supabase/client.ts`, and shared hydrate/auto-sync modules used by features outside the completed Dev A scope.

The scanner is working as intended. Removing the public variables or weakening the scan would make legacy features fail or conceal a real exposure, so neither was done.

## Required Cutover Decision

Passing the leakage gate requires the A6/system-wide cutover: migrate remaining browser-Supabase consumers to BFF APIs, remove `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` from browser builds, then rotate the exposed publishable key. This must be scheduled with the owners of the remaining features before changing the shared runtime configuration.
