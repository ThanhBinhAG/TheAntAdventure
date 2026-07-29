# app/api/health/ — Agent overview

## Role
Liveness/health check endpoint for ops and CI.

## Contents
- Health route handler

## Boundaries
- Keep dependency-light; prefer `lib/system/health` if shared checks grow.
