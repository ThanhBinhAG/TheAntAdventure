# app/api/tour-design/outline-workflow — Agent overview

## Role
Write BFF endpoint for atomic Tour Design Outline workflow transitions.

## Boundaries
- Require `tour_design.write`; the database RPC derives Lead and Comm changes from the action.
