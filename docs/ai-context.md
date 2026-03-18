# AI Context

## Purpose
This repo is the mobile-first backend for the Kinetiq habits/todos app.

## Current Foundation
- Auth: Clerk + bearer-token friendly `authGuard`
- Canonical app user: DB `User`
- App state: profile + preferences + onboarding via `/api/v1/me`
- Devices: idempotent token registration via `/api/v1/devices`
- Notifications: preference-read foundation only
- Subscriptions: entitlement resolution (`isPro`, `plan`, `status`) integrated into `/api/v1/me`
- Habits: CRUD + complete/uncomplete with local-day completion history
- Tasks: CRUD + complete/reopen
- Streaks: projection recomputed from habit completion history
- Progression: XP ledger source-of-truth + profile projection
- Achievements: seeded definitions + idempotent unlocks

## Rules for Future Changes
- Keep route handlers thin; put logic in module services.
- Preserve shared API response shape.
- Use Zod for validation.
- Build habits/todos scope incrementally; avoid unrelated domains unless explicitly requested.
- Update `CHANGELOG.md` for meaningful changes.
