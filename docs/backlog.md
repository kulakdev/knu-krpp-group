# Backlog draft (v1.0)

> **Owner: PM.** This file is a *starting draft* — the canonical backlog lives
> in Jira. Refine wording, estimates, and priorities there; keep this file as
> the map between Jira issues and code stubs (`TODO(BOOK-n)`).
>
> Rule: every stub in the codebase marked `TODO(BOOK-n)` is someone's
> individual contribution. Agents must not implement them autonomously
> (see AGENTS.md). Each task below includes at least one positive and one
> negative/boundary acceptance criterion (lab section 4).

Suggested sequencing: BOOK-1..5 are done (this bootstrap). BOOK-12 blocks
BOOK-8/9/10. BOOK-6 blocks BOOK-8/11. BOOK-7 blocks BOOK-10.

| Key | Title | Stub location | Role suggestion |
|---|---|---|---|
| BOOK-1 | Repo scaffold, tooling, conventions | — (done) | tech lead |
| BOOK-2 | DB infrastructure: compose, schema, seed | — (done) | tech lead |
| BOOK-3 | CI pipeline + PR gates + artifact | — (done, owned going forward) | ci/cd |
| BOOK-4 | Docs: ADRs, diagrams, contracts, quality reqs | — (done) | pm + tech lead |
| BOOK-5 | Test harness (supertest adapter, db reset) | — (done) | qa |
| BOOK-6 | Interval logic `[start, end)` | `lib/intervals.ts` | dev A |
| BOOK-7 | Booking state machine v1.0 | `lib/booking-state.ts` | dev B |
| BOOK-8 | Create booking with concurrency protection | `lib/booking-service.ts` + `app/api/bookings/route.ts` (POST) | dev A |
| BOOK-9 | List my bookings | `lib/booking-service.ts` + `app/api/bookings/route.ts` (GET) | dev B |
| BOOK-10 | Cancel booking with owner check | `lib/booking-service.ts` + `app/api/bookings/[id]/route.ts` | dev A |
| BOOK-11 | List rooms with availability filter | `lib/booking-service.ts` + `app/api/rooms/route.ts` | dev B |
| BOOK-12 | Mock auth helper (x-user-id) | `lib/auth.ts` | dev B |
| BOOK-13 | Dashboard UI: switcher, booking panel, my bookings | `app/page.tsx` | dev A |
| BOOK-14 | Unit tests: intervals + state machine | `tests/unit/` | qa |
| BOOK-15 | Integration test: concurrent double-booking | `tests/integration/concurrency.test.ts` | qa |
| BOOK-16 | Integration tests: lifecycle + access (403) | `tests/integration/` | qa |
| BOOK-17 | Perf script for QR-3 + quality-results.md | `scripts/perf-availability.ts` | qa |

## User stories and change request

Tasks above implement these stories (linked in Jira as "relates to").

| Key | Story | Implemented by | Release |
|---|---|---|---|
| BOOK-18 | FR-01 View rooms and availability for an interval | BOOK-6, 11, 13 | v1.0 |
| BOOK-19 | FR-02 Create a booking | BOOK-6, 8, 12, 13 | v1.0 |
| BOOK-20 | FR-03 View my bookings | BOOK-9, 12, 13 | v1.0 |
| BOOK-21 | FR-04 Cancel my own booking | BOOK-7, 10, 12, 13 | v1.0 |
| BOOK-22 | Extra story (team of 4, lab 2.3): filter rooms by equipment — awaiting team confirmation, tasks not split yet | — | v1.0 |
| BOOK-23 | Change request: admin approval for rooms with capacity > 100 | tasks created at KT-6 | v2.0 |
| BOOK-24 | Confluence knowledge base skeleton + repo docs sync | — | v1.0 |

Jira currently shows these issues as `KAN-<n>` until the project key is
renamed to `BOOK`; the numbers are identical.

## Acceptance criteria per task

### BOOK-6 — Interval logic
- Positive: `overlaps(10-11, 11-12)` is `false` (adjacency allowed).
- Boundary: `isValidInterval(t, t)` is `false`; inverted interval is `false`.
- Covers lab rule: `[start, end)` semantics.

### BOOK-7 — State machine
- Positive: `canTransition(ACTIVE, CANCELLED)` is `true`.
- Negative: any transition out of `CANCELLED` is forbidden;
  `assertTransition` throws `InvalidTransitionError`.

### BOOK-8 — Create booking (FR-02)
- Positive: valid request returns 201 and the booking is readable after
  app restart (persistence).
- Negative: `startTime >= endTime` returns 400; overlapping active booking
  returns 409; two parallel requests for the same slot yield exactly one 201
  (verified by BOOK-15).
- Must follow ADR-001: one interactive transaction, `SELECT ... FOR UPDATE`
  on the room row, overlap check inside the transaction.

### BOOK-9 — List my bookings (FR-03)
- Positive: user sees own ACTIVE and CANCELLED bookings with room names.
- Negative: response never contains another user's bookings.

### BOOK-10 — Cancel booking (FR-04)
- Positive: owner cancels ACTIVE booking -> 200, status CANCELLED, slot
  becomes available (BOOK-11 shows room free for that interval).
- Negative: non-owner gets 403 and the booking stays ACTIVE (QR-1);
  unknown id -> 404.

### BOOK-11 — Rooms with availability (FR-01)
- Positive: without filter returns all rooms; with `?startTime&endTime` the
  room with an overlapping active booking reports `isAvailable: false`.
- Boundary: interval adjacent to an existing booking reports
  `isAvailable: true`; only one of the two params -> 400.

### BOOK-12 — Mock auth
- Positive: seeded `x-user-id` returns the user record with role.
- Negative: missing or unknown header -> 401.

### BOOK-13 — Dashboard UI
- Positive: switching the mock user changes which bookings are listed and
  which `x-user-id` header is sent; a booking can be created and cancelled
  from the UI.
- Display: times rendered in Europe/Kyiv; occupied rooms cannot be booked
  from the UI (server still re-validates).

### BOOK-14 — Unit tests
- Covers: interval validity, partial overlap, adjacency, forbidden state
  transition (mandatory set, lab section 7.2).

### BOOK-15 — Concurrency test
- Two simultaneous POSTs for the same room/slot: exactly one 201, one 409,
  exactly one ACTIVE booking in the DB afterwards.

### BOOK-16 — Lifecycle + access tests
- Full path through the API: create -> list -> cancel -> slot free.
- Non-owner cancel -> 403 and booking unchanged (QR-1).

### BOOK-17 — Perf script (QR-3)
- Seeds 1,000 bookings, measures `GET /api/rooms?startTime&endTime` p95 over
  100 sequential requests after 10 warm-up requests, against a production
  build; appends machine specs, commit SHA, and results to
  `docs/quality-results.md`. Threshold: p95 <= 1s.

## v2.0 change request (BOOK-23, lab section 10)

Rooms with capacity > 100 require admin approval: new status PENDING
(reserves slot), admin transitions PENDING -> ACTIVE | REJECTED, requester
may cancel PENDING, decisions are audited (author, time, result). Impact
analysis, migration, and ADR review are prepared in КТ-6 — do not start
before v1.0 is tagged.
