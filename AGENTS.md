<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Team agent ruleset (tool-agnostic)

This file is the single source of truth for ALL coding agents on this
project (Kilo, Claude Code, Cursor, Copilot, Junie). Tool-specific configs
(`CLAUDE.md`, `.cursor/rules/`, `.github/copilot-instructions.md`,
`.junie/guidelines.md`) only point here — never duplicate rules into them.

## 1. Hard rules (violations = blocked in review)

1. **Never implement stubs marked `TODO(BOOK-n)`.** Each is an assigned
   individual contribution (docs/backlog.md). If asked to implement one,
   confirm the requester is the task owner and the work happens on a
   `BOOK-n-*` branch via the normal PR flow.
2. **Never commit, push, or run other git mutations** unless the human
   explicitly asks for that specific action.
3. **Never fabricate process evidence** (reviews, retros, incident
   timelines, test results). Drafting from real artifacts is allowed.
4. **Never weaken or delete tests, CI gates, or lint rules** to make a
   change pass. Report the failure; the human decides.
5. **Secrets stay out of the repo.** `.env` is git-ignored; only
   `.env.example` is committed.

## 2. Code style contract

Enforced by ESLint + typecheck in CI; agents must conform before proposing.

- TypeScript strict; no `any` without an eslint-disable comment plus a
  written justification.
- No business logic in route handlers (`app/api/**`): parse input ->
  authenticate -> delegate to `lib/` services -> shape response.
- Errors: throw typed errors from `lib/errors.ts`
  (`ValidationError` 400, `UnauthorizedError` 401, `ForbiddenError` 403,
  `NotFoundError` 404, `ConflictError` 409). Never `throw new Error`
  across the HTTP boundary; `lib/api.ts` (`apiHandler`) is the only place
  that maps errors to responses.
- Every API route uses `apiHandler` (correlation id + structured logging).
- Time: ISO 8601 UTC on the wire and in the DB; Europe/Kyiv only at the
  presentation boundary via `date-fns-tz`.
- `[start, end)` interval semantics everywhere; overlap/status logic must
  go through `lib/intervals.ts` and `lib/booking-state.ts`
  (`BLOCKING_STATUSES`), never reimplemented inline.
- Naming: camelCase vars/functions, PascalCase types/components, Jira key
  in branch names and PR titles (`BOOK-12-short-description`).
- Tests: Vitest, Arrange/Act/Assert, deterministic data via
  `tests/helpers/db.ts`, no wall-clock dependence (inject time values).

## 3. Workflow contract

- One Jira issue -> one short-lived branch -> one PR.
- PR description uses `.github/PULL_REQUEST_TEMPLATE.md` (problem, result,
  verification, risks, AI-assistance checkbox) — all sections filled.
- Definition of Done: acceptance criteria met, tests green in CI, review
  approved, docs updated if behavior/contract/runbook changed.
- Docs that must stay consistent with code: `docs/api-contract.md`,
  `docs/domain-model.md`, `docs/runbook.md`, `confluence/adr-*.md`.
  A change that contradicts them must update them in the same PR.

## 4. Project map

- `app/api/**` — transport layer (route handlers, stubs until BOOK-8..11)
- `lib/**` — business logic and infrastructure (`booking-service`,
  `booking-state`, `intervals`, `auth`, `errors`, `api`, `prisma`, `logger`)
- `prisma/**` — schema, migrations, deterministic seed
- `tests/**` — Vitest: `unit/`, `integration/`, `helpers/`
- `scripts/**` — smoke, backup/restore, fault injection
- `docs/**` — backlog, contracts, models, quality reqs, test strategy
- `confluence/**` — ADRs and architecture diagrams (canonical, versioned
  with code; Confluence cloud pages link here)

## 5. Useful commands

```bash
npm run dev          # app with hot reload
npm test             # all tests (needs docker compose up -d db + migrations)
npm run test:unit    # DB-free subset
npm run lint && npm run typecheck
npm run db:migrate   # create/apply migration locally
npm run db:seed      # idempotent seed
scripts/smoke.sh     # post-deploy verification
```
