# University Room Booking Service

Group lab project — team development lifecycle (v1.0 -> incident -> v2.0).
Students book university rooms for time intervals; overlapping bookings for
the same room are impossible; v2.0 adds admin approval for large rooms.

**Confluence home:** https://knu-team-qhkppj1p.atlassian.net/wiki/spaces/SD/overview
(entry point for all project materials)
**Jira project:** https://knu-team-qhkppj1p.atlassian.net/jira/software/projects/KAN/boards
(key is being renamed `KAN` -> `BOOK`; issue numbers stay the same)

## Stack

Next.js (App Router, TypeScript, standalone output) · Tailwind + shadcn/ui ·
PostgreSQL 16 (Docker Compose) · Prisma 7 · Vitest + Supertest · mock auth
via `x-user-id` header.

## Prerequisites

- Node.js 20+ and npm
- Docker (for the local Postgres container)

## Setup

```bash
cp .env.example .env
npm ci
docker compose up -d db
npm run db:migrate     # creates schema (first run) / applies migrations
npm run db:seed        # idempotent: 3 users, 3 rooms
npm run dev            # http://localhost:3000
```

Seeded identities (use as `x-user-id` / in the UI switcher):
`student-1`, `student-2`, `admin-1`.

## Everyday commands

| Command | Purpose |
|---|---|
| `npm test` | all tests (needs DB running + migrations applied) |
| `npm run test:unit` | DB-free unit tests |
| `npm run lint` / `npm run typecheck` | static checks (same as CI) |
| `npm run db:migrate` | create/apply a migration during development |
| `npm run db:seed` | re-apply the deterministic seed |
| `scripts/smoke.sh` | post-deploy smoke check of the main user path |
| `scripts/backup.sh` / `scripts/restore.sh` | database dump and verified restore |

Note: `"lint": "eslint"` — Next.js 16 removed `next lint`; ESLint runs
directly (flat config in `eslint.config.mjs`).

## Repository layout

- `app/` — UI + API route handlers (transport only)
- `lib/` — business logic and infrastructure
- `prisma/` — schema, migrations, seed
- `tests/` — Vitest suites + harness (`tests/helpers/`)
- `scripts/` — smoke, backup/restore, fault injection
- `docs/` — backlog, API contract, domain model, quality requirements,
  test strategy, runbook, AI-usage log
- `confluence/` — ADRs and architecture diagrams (canonical sources;
  Confluence cloud pages link here)

## Process

- Work happens per Jira issue on `BOOK-n-*` branches via pull requests —
  see CONTRIBUTING.md.
- Agent/LLM rules for all tools: AGENTS.md.
- Code stubs marked `TODO(BOOK-n)` are assigned individual tasks
  (docs/backlog.md) — they are implemented by their owners, not by tooling.
- Operations (diagnostics, recovery, rollback): docs/runbook.md.

## Releases

- `v1.0` — base booking flow (tag after КТ-4, immutable afterwards)
- `v2.0` — adds admin approval for rooms with capacity > 100

Release artifacts are produced by CI as `booking-app-<sha>.tar.gz`
(standalone server + migrations + dependency lockfile).
