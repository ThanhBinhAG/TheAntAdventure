# lib/server/ — Agent overview

## Role
Server-only infrastructure boundaries shared by routes, Server Components, and backend libraries.

## Contents
- `env/` — runtime environment accessors that must never enter a browser bundle

## Boundaries
- Import only from server code; every module in this folder starts with `import 'server-only'`.
- Do not add client configuration or domain logic here.
