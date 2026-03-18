# Kinetiq API

Mobile-first backend for the Kinetiq habits and todos app.
This repo currently provides the authenticated app foundation (user, preferences, devices, subscriptions) that the habits/todos domain will build on.

## Quickstart

1. Install dependencies and link Vercel
```bash
pnpm install
vercel link
```
If Prisma scripts are blocked:
```bash
pnpm approve-builds
pnpm install
```

2. Create database (Neon via Vercel)
- Vercel dashboard -> your project -> Storage
- Create **Neon Postgres**
- Vercel will automatically inject the required database environment variables:
  - `POSTGRES_PRISMA_URL`
  - `POSTGRES_URL_NON_POOLING`

3. Set up Clerk (Auth)
- Go to https://clerk.com and create an application.
- Add these env vars in Vercel:
```bash
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
CLERK_SECRET_KEY
```
- These environment variables will be pulled into your local `.env` via `vercel env pull`.

4. Pull environment variables
```bash
vercel env pull .env.local
cp .env.local .env
```

5. Run migrations
```bash
pnpm exec prisma migrate dev
```

6. Start dev server
```bash
pnpm dev
```

7. Smoke test
- Open `/api/health`
- Call `/api/v1/me` using a Clerk session token in:
  - `Authorization: Bearer <token>`
- Register a device via `POST /api/v1/devices`

## Important
- Clerk handles authentication.
- Postgres is required.
- This is a backend API for the mobile product (not a full web UI product).

## What This Is
- Next.js App Router backend for Kinetiq
- Clerk auth with bearer-token-friendly API protection
- Prisma + Postgres data layer
- Versioned app endpoints under `/api/v1/*`
- Canonical app user (`/api/v1/me`) with profile/preferences/onboarding/subscription state
- Device registration endpoint (`/api/v1/devices`)
- Foundation for upcoming habits/todos modules

## Required Environment Variables
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `POSTGRES_PRISMA_URL`
- `POSTGRES_URL_NON_POOLING`

Optional:
- `CLERK_WEBHOOK_SECRET` (required only for `/api/webhooks/clerk`)

## Health Checks
```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

## Docs
- [Architecture](docs/architecture.md)
- [API Contract](docs/api-contract.md)
- [Frontend Integration](docs/frontend-integration.md)
- [AI Context](docs/ai-context.md)
- [Changelog](CHANGELOG.md)
- [Agent Rules](AGENTS.md)
