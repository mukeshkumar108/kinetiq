# Architecture

## Overview
This is a mobile-first backend for the Kinetiq habits/todos app, built on Next.js App Router, Clerk auth, and Prisma/Postgres.

Core principles:
- thin route handlers
- service-layer business/data logic
- canonical DB `User`
- stable JSON API contracts

Current status:
- Core identity/device/subscription foundation is implemented.
- Habits/todos domain modules are the next product layer on top of this baseline.

## Modules

### Auth
- `src/lib/auth/auth-guard.ts`
- Bearer-token friendly request protection for `/api/v1/*`.
- Uses Clerk request auth and returns canonical DB user context.

### Users
- `src/modules/users/*`
- Manages canonical app user profile/preferences/onboarding.
- `/api/v1/me` reads and updates user-facing app state.

### Devices
- `src/modules/devices/*`
- Idempotent device registration by `pushToken`.
- `POST /api/v1/devices` upserts device metadata and heartbeat fields.

### Notifications
- `src/modules/notifications/*`
- Foundation-only currently: reads notification preferences from user preferences.
- No push delivery infrastructure yet.

### Subscriptions
- `src/modules/subscriptions/*`
- Resolves effective entitlements from subscription records.
- `/api/v1/me` includes normalized subscription state (`isPro`, `plan`, `status`).

### Habits
- `src/modules/habits/*`
- Recurring habit CRUD with daily completion semantics.
- Completion history lives in `HabitCompletion`; streak projection lives in `HabitStreak`.

### Tasks
- `src/modules/tasks/*`
- One-off todo/task CRUD with explicit `open|completed` status.

### Completions
- `src/modules/completions/*`
- Transactional completion/reversal flows for habits and tasks.
- Habit completion: writes completion, recomputes streak, grants XP, evaluates achievements.
- Task completion: updates task state, grants XP, evaluates achievements.

### Progression
- `src/modules/progression/*`
- XP ledger is source of truth (`XpLedgerEntry`).
- `ProgressionProfile` is a projection (`level`, `totalXp`, `currentLevelXp`, `nextLevelXp`).

### Achievements
- `src/modules/achievements/*`
- Definition table + user unlock table.
- Unlocking is idempotent via unique `(userId, achievementDefinitionId)`.

## Data Model Highlights
- `User` is canonical application user.
- `Device` tracks client device tokens and metadata.
- `Subscription` stores source/status history; entitlements are derived in service layer.
- `HabitCompletion` and `XpLedgerEntry` are source-of-truth history tables.
- `HabitStreak` and `ProgressionProfile` are projection tables.
