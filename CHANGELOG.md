# CHANGELOG

Concise engineering changelog for Kinetiq API.

## Habits/Tasks Progression Foundation (2026-03-18)
### Summary
- Added first product domain foundation for habits, tasks, streaks, progression, and achievements.

### Key Changes
- Added Prisma models:
  - `Habit`, `HabitCompletion`, `HabitStreak`
  - `Task`
  - `ProgressionProfile`, `XpLedgerEntry`
  - `AchievementDefinition`, `UserAchievement`
- Added migration `20260318152000_habits_tasks_progression_foundation`.
- Added services/modules:
  - `src/modules/habits/*`
  - `src/modules/tasks/*`
  - `src/modules/completions/*`
  - `src/modules/streaks/*`
  - `src/modules/progression/*`
  - `src/modules/achievements/*`
- Added `/api/v1` endpoints:
  - habits CRUD + complete/uncomplete
  - tasks CRUD + complete/reopen
  - progression, achievements, today snapshot
- Added achievement seed definitions for `habit_streak_3`, `habit_streak_7`, `tasks_10`, `xp_100`.
- Added tests for completion flow, duplicate prevention, streak calculation, task XP grant, and achievement unlock idempotency.

### Decisions Locked In
- `HabitCompletion` and `XpLedgerEntry` are source-of-truth history.
- `HabitStreak` and `ProgressionProfile` are projections recalculated/updated from source history.
- Completion flows are transaction-based and mobile-friendly.

## Initial Baseline (2026-03-18)
### Summary
- Started this repository as the Kinetiq habits/todos backend codebase.
- Reset changelog history from the source starter; prior starter evolution entries are intentionally excluded.

### Baseline Included
- Next.js App Router backend with versioned app surface under `/api/v1/*`.
- Clerk-based auth with bearer-token-friendly API access.
- Prisma/Postgres persistence with canonical app `User`.
- Existing foundation modules currently present in codebase (`users`, `devices`, `subscriptions`, `notifications`).
- Shared API response envelope and Zod-based validation patterns.

### Decisions Locked In
- This changelog tracks Kinetiq-only history from this point forward.
- Starter-template evolution history is treated as upstream context, not project history.
