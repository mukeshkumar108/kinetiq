# CHANGELOG

Concise engineering changelog for Kinetiq API.

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
