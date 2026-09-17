# Test strategy (lab section 7.2)

Scenarios are mapped to the risks they guard against. Coverage percentage
may be reported as a supporting metric but does not replace these scenarios.

| Level | Scenario | Risk addressed | Owner |
|---|---|---|---|
| Unit | Interval validity: inverted, zero-length | Invalid data persisted | QA (BOOK-14) |
| Unit | Partial overlap, full containment detected | Double-booking via logic error | QA (BOOK-14) |
| Unit | Adjacency allowed (`end == start`) | Over-rejecting valid bookings | QA (BOOK-14) |
| Unit | Forbidden state transition rejected | Illegal lifecycle (e.g. resurrecting cancelled) | QA (BOOK-14) |
| Integration | Persistence roundtrip through real Postgres | ORM/migration drift | QA (BOOK-16) |
| Integration | Two parallel requests, one slot: exactly one 201 | Race condition double-booking | QA (BOOK-15) |
| E2E (API) | create -> list -> cancel -> slot free | Broken main user path | QA (BOOK-16) |
| Access | Non-owner cancel -> 403, booking unchanged | Privilege escalation (QR-1) | QA (BOOK-16) |
| Regression (v2.0) | All v1.0 tests green after approval workflow lands | Modification breaks base behavior | QA |

Rules:

- Tests run against a real Postgres (docker compose locally, service
  container in CI) — no in-memory fakes for integration levels.
- Test data is deterministic: `tests/helpers/db.ts` resets to the seeded
  users/rooms and zero bookings before each integration file.
- Integration files run serially (`fileParallelism: false`) because they
  share one database.
- The concurrency test may be run repeatedly (`vitest --repeat`) to surface
  timing flakiness — recorded as preventive action in the risk registry.
- A failing test must fail for the right reason: assertions target the
  documented contract (docs/api-contract.md), not incidental behavior.
