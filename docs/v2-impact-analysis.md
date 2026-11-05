# v2.0 change request: impact analysis (BOOK-29)

Prepared 2026-11-03, before any v2.0 implementation is merged (lab section
10.2). Change request: BOOK-23. Implementation tasks: BOOK-30 … BOOK-35.

## 1. Change request

After the v1.0 release, a booking of a room with capacity **over 100** seats
requires administrator approval (lab section 10.1):

- a new booking of a large room gets status `PENDING`;
- a `PENDING` booking reserves its slot — no other active or pending booking
  may overlap it;
- an administrator moves `PENDING` → `ACTIVE` or `REJECTED`;
- the requester can cancel their own `PENDING` request; rejection or
  cancellation releases the slot;
- a regular user cannot approve or reject (server-side check);
- a repeated decision on a processed request does not create a
  contradictory state;
- rooms with capacity ≤ 100 keep the v1.0 behaviour (immediately `ACTIVE`);
- existing v1.0 records keep ids, owners, intervals and statuses; no
  retroactive approval;
- UI and API show the current status; the author, time and result of every
  admin decision are recorded.

One administrative role is enough; per-building administrators are out of
scope.

**Type of maintenance:** perfective — a new business rule requested by the
stakeholder. It is preceded by preventive work (characterisation tests and a
preparatory refactoring) so the change can be made safely.

## 2. Impact by area

| Area | Impact | Where | Task |
|---|---|---|---|
| Code — state model | New statuses and transitions; the blocking set becomes `{ACTIVE, PENDING}`; the initial status depends on room capacity | `lib/booking-state.ts` (single source: `TRANSITIONS`, `BLOCKING_STATUSES`, new `initialStatus`) | BOOK-30, BOOK-32 |
| Code — services | `createBooking` reads the room capacity inside the locked transaction; `cancelBooking` accepts `PENDING`; new `decideBooking`, `listPendingBookings` with an admin check | `lib/booking-service.ts` | BOOK-30, BOOK-32, BOOK-33 |
| Data | `BookingStatus` gains `PENDING`, `REJECTED`; new enum `BookingDecision`; nullable `decision`, `decidedById`, `decidedAt` on `Booking`. Additive migration — no existing row is rewritten | `prisma/schema.prisma`, migration `approval_workflow` | BOOK-31 |
| API | `POST /api/bookings` may return `status: "PENDING"`; every booking response gains `decision`, `decidedById`, `decidedAt`; `DELETE` works for `PENDING` and returns 409 for `REJECTED`; new `GET /api/admin/bookings`, `POST /api/admin/bookings/:id/approve` and `/reject`. Existing fields keep their meaning | `app/api/**`, `docs/api-contract.md` | BOOK-32, BOOK-33 |
| Rights | Approve / reject / queue only for `Role.ADMIN` (403 otherwise), enforced in the service, not the UI. Cancel stays owner-only — the admin does not cancel, they reject | `lib/booking-service.ts` | BOOK-33 |
| UI | Status badges for all four statuses; "waiting for approval" and "Approved / Rejected by …" in My bookings; Cancel also for `PENDING`; new `/admin` page with the queue | `app/**`, `api-client/admin` | BOOK-34 |
| Tests | Characterisation tests pin v1.0 behaviour first; new unit tests for transitions and `initialStatus`; integration tests for PENDING blocking, withdrawal, 403, repeated and concurrent decisions; the BOOK-15 concurrency test must stay green | `tests/**` | BOOK-30, BOOK-32, BOOK-33 |
| Docs | Domain model (v2.0 state machine, ER fields), API contract, test strategy, runbook, README; ADR-001 review (section 5) | `docs/**`, `confluence/adr-001-*.md` | BOOK-29, BOOK-35 |
| Operations | Smoke check extended with the approval path; migration procedure with a data check before and after; rollback limits documented; new log operations `admin.bookings.*` appear in `ops:report` | `scripts/smoke.sh`, `scripts/data-check.ts`, `docs/runbook.md` | BOOK-31, BOOK-35 |

Not affected: authentication (mock `x-user-id`), interval rules and
`lib/intervals.ts`, the equipment filter, CI pipeline steps.

## 3. Risks and mitigations

| # | Risk | Mitigation | Verified by |
|---|---|---|---|
| V1 | `PENDING` does not reserve the slot → two bookings for one slot | `PENDING` added to `BLOCKING_STATUSES`, the only set the overlap query reads | integration test "a PENDING booking reserves its slot"; BOOK-15 concurrency test |
| V2 | Regression of v1.0 behaviour (small rooms, cancel rules, availability) | Characterisation tests merged **before** any behaviour change | `v1-characterisation.test.ts` stays green through BOOK-31 … BOOK-35 |
| V3 | Migration loses or alters v1.0 data, or approves old bookings retroactively | Additive migration (new enum values, nullable columns); `npm run data:check` before and after | equal counts, statuses and key-field fingerprint; zero bookings with a decision after migration |
| V4 | Two admins (or two clicks) decide differently on one request | Decision is a conditional update `WHERE status = PENDING`; same decision again is a no-op, the opposite one is 409 | concurrent approve + reject test: exactly one applies |
| V5 | Owner cancels while the admin decides; a stale read lets the cancel overwrite a fresh `REJECTED` / `ACTIVE`, producing a transition the state machine forbids | Cancel becomes a conditional update on the status it read (409 if it changed meanwhile) — implemented in BOOK-41 | integration test for a cancel that races with a decision (`admin-decisions.test.ts`) |
| V6 | A student approves their own request (privilege escalation) | Admin check in `decideBooking` / `listPendingBookings`, independent of the UI | 403 tests for approve, reject and the queue; booking unchanged |
| V7 | Rollback to v1.0 after the release breaks data or rules | v1.0 code cannot read `PENDING` / `REJECTED` and does not treat `PENDING` as blocking → code-only rollback is **not safe** once a large-room request exists | documented in the runbook; supported path is restoring the pre-upgrade backup |

## 4. Release stages and recovery

Each stage is one PR with green CI and review; the order is enforced by
Jira "blocks" links.

1. **BOOK-30a** characterisation tests (no behaviour change).
2. **BOOK-30b** refactoring: initial status moved into the state module —
   test results identical before and after.
3. **BOOK-31** schema migration (additive), `data:check` before/after.
4. **BOOK-32** approval rule in the domain (small rooms unchanged).
5. **BOOK-33** admin API.
6. **BOOK-34** UI: statuses, admin panel.
7. **BOOK-35** docs, smoke with approval path, tag `v2.0`, smoke on the
   packaged build, result recorded in BOOK-23.

Stages 1–3 change no observable behaviour; until stage 4 is merged, `main`
can still be released as a v1.x build.

**Recovery:** before upgrading, take `scripts/backup.sh` and
`npm run data:check`. If v2.0 has to be withdrawn, deploy the v1.0 artifact
and restore that backup (`scripts/restore.sh`); bookings created after the
upgrade are lost and must be re-entered, which is announced before the
rollback. A schema downgrade that converts `PENDING` / `REJECTED` rows is
not offered — it would destroy the approval history.

## 5. ADR-001 review

ADR-001 (row lock + overlap check in one transaction) is kept. Reviewed
against v2.0:

- The overlap query reads `BLOCKING_STATUSES`, so it covers `PENDING`
  without a code change at the call site; the room-row lock still
  serialises concurrent creates per room.
- Admin decisions do not need the room lock: approving keeps the slot
  reserved (`PENDING` → `ACTIVE`, both blocking) and rejecting frees it, so
  neither can create an overlap. Their own race is handled by the
  conditional update (risk V4).
- New race found by this review: owner cancel vs admin decision (risk V5) —
  handled by a conditional update in `cancelBooking`.

Outcome recorded in `confluence/adr-001-concurrency-protection.md`
("Review — v2.0").

## 6. Scale of the change: alternatives

| Option | Risk | Effort | Continuity of work |
|---|---|---|---|
| **Local change** — extend the state table, blocking set and services; add admin endpoints and a page | Low: changes are confined to the modules designed as extension points; characterisation tests guard v1.0 | Low (≈ 6 small PRs) | v1.0 keeps working; every stage is releasable |
| Gradual replacement — e.g. a separate approval service or workflow engine beside the booking service, switched over step by step | Medium: two places decide a booking's status during the transition; extra integration and data sync | Medium–high | Possible, but a dual-run period is needed |
| Full rewrite of the booking module around a generic workflow | High: re-implements proven concurrency handling (ADR-001) and loses test history | High | Breaks continuity; v1.0 frozen until the rewrite is done |

**Choice: local change.** The v1.0 design already isolated the parts that
change (`TRANSITIONS`, `BLOCKING_STATUSES`, the single overlap query), one
rule and one role are added, and the risks above are covered by tests and
an additive migration. A full reengineering is not required by the change
request and would bring more risk than it removes.
