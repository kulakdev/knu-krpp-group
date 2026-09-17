# ADR-001: Захист від паралельного бронювання (Concurrency)

## Status

Accepted (v1.0)

## Context

The system must manage room reservations with strict interval constraints: `[start, end)`. Overlapping bookings for the same room are forbidden. The lab specifically mandates passing a concurrency test where two simultaneous requests attempt to book the exact same slot (Section 7.2), as well as executing a controlled service outage drill (Section 8.3).

## Options Considered

### Option 1: SQLite with Prisma

- **Pros:** Zero setup overhead; single file database; runs directly in Node.js without external dependencies.
- **Cons:** SQLite uses database-level write locks. Under concurrent write requests, it frequently throws `SQLITE_BUSY: database is locked` errors rather than handling transactional rollbacks gracefully. Simulating a realistic service crash during the incident drill requires file permission tampering or corrupted bytes.

### Option 2: PostgreSQL (Docker Compose) with Prisma

- **Pros:** Native support for row-level locking (`SELECT ... FOR UPDATE`) and serializable transactions, ensuring clean isolation during parallel booking attempts. Outage simulation is clean and reproducible by stopping the Docker container (`docker compose stop db`).
- **Cons:** Requires Docker to be installed and running on each developer machine.

## Decision

We chose **Option 2: PostgreSQL via Docker Compose with Prisma**. PostgreSQL directly satisfies the concurrency verification and operational drill requirements with predictable behavior.

The concrete isolation mechanism is a Prisma interactive transaction with `SELECT ... FOR UPDATE` on the target room row before checking for overlapping active bookings. This serializes concurrent booking attempts per room, so exactly one of two simultaneous requests for the same slot can succeed; the loser observes the overlap and receives a `409 Conflict`. Serializable isolation was considered and rejected for v1.0 because it requires retry-on-serialization-failure logic that adds complexity without changing the observable outcome for this single-table access pattern.

## Consequences

- **Positive:** Clean transaction handling during parallel booking tests; realistic incident management; standard Prisma schema support; per-room locking keeps unrelated bookings concurrent.
- **Negative:** Local development requires Docker running in the background; the lock scope (room row) must be revisited if bookings ever span multiple rooms.

## Review Condition

Revisit if developer machine constraints make running local Docker containers unfeasible. **Scheduled review for v2.0:** the set of slot-blocking statuses changes when `PENDING` is introduced (a pending booking must also reserve its slot, Section 10.1), so the overlap query inside the locked transaction must be re-validated against `[ACTIVE, PENDING]`.
