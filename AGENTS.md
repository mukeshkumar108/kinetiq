# AGENTS.md

## Purpose
This repository is the **mobile-first backend for the Kinetiq habits and todos app**.

## What This Repo Is
- Next.js App Router backend for a habits/todos product
- Versioned app API foundation (`/api/v1/*`)
- Clerk-based authentication with bearer-token friendly API access
- Prisma/Postgres persistence with a canonical application `User`
- Zod-driven request/env validation

## Architecture Rules
- Keep route handlers thin: parse/validate input, call service, return response.
- Put domain/business/data logic in module services (`src/modules/*`).
- Clerk is the auth provider; DB `User` is the canonical app user.
- Preserve shared app API response shape:
  - success: `{ success: true, data, error: null }`
  - error: `{ success: false, data: null, error: { message, code } }`
- Use Zod as the validation standard for payload/query/env contracts.

## Data and Contract Rules
- Maintain stable mobile-friendly contracts for `/api/v1/*`.
- Prefer explicit normalization rules over implicit behavior.
- Keep defaults predictable (especially `preferences` and onboarding fields).
- Avoid browser-only assumptions in app-facing APIs.

## Change Discipline
- Make minimal, iteration-scoped changes.
- Do not add new domains outside explicit scope.
- Prioritize habits/todos domain incrementally with stable contracts.
- Update `CHANGELOG.md` for any meaningful change set.
- Future agents should read `AGENTS.md` and `CHANGELOG.md` before substantial edits.
