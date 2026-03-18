# Frontend Integration (React Native)

## 1) Authenticate with Bearer Token

Use Clerk in the mobile app and send session token on API calls:

`Authorization: Bearer <session_token>`

Protected app endpoints rely on this header via `authGuard`.

## 2) Fetch Canonical User State

Call:

`GET /api/v1/me`

Use this as startup/bootstrap state for:
- profile
- preferences
- onboarding
- subscription entitlements

## 3) Update User App State

Call:

`PATCH /api/v1/me`

Send only sections you want to update (`profile`, `preferences`, `onboarding`).

## 4) Register Device Token

After obtaining a push token on device:

`POST /api/v1/devices`

with payload:

```json
{
  "platform": "ios",
  "pushToken": "<token>",
  "appVersion": "1.0.0"
}
```

This endpoint is idempotent by token and safe to call multiple times.

## 5) Typical App Flow

1. User signs in with Clerk.
2. App fetches `GET /api/v1/me`.
3. App registers token with `POST /api/v1/devices`.
4. App updates profile/preferences via `PATCH /api/v1/me` as needed.

## 6) Habits and Tasks Flows

Habits:
1. Fetch habits: `GET /api/v1/habits`
2. Create/edit/delete with standard CRUD endpoints.
3. Mark done for day: `POST /api/v1/habits/:id/complete` (optionally include `timezone`).
4. Undo for day: `POST /api/v1/habits/:id/uncomplete`.

Tasks:
1. Fetch tasks: `GET /api/v1/tasks`
2. Create/edit/delete with standard CRUD endpoints.
3. Complete: `POST /api/v1/tasks/:id/complete`
4. Reopen: `POST /api/v1/tasks/:id/reopen`

Progression/Achievements:
- `GET /api/v1/progression`
- `GET /api/v1/achievements`
- `GET /api/v1/today?timezone=<IANA_TZ>`
