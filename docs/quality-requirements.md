# Verifiable quality requirements (lab section 4)

Each requirement states conditions, threshold, and verification method.
Results of each verification run are recorded with date and commit SHA in
`docs/quality-results.md` (created on first run).

## QR-1 — Access control

- **Requirement:** a `DELETE /api/bookings/:id` request from a non-owner
  returns 403 and leaves the booking ACTIVE.
- **Threshold:** 100% of cases, zero failures.
- **Verification:** automated integration test (BOOK-16) executed in CI on
  every PR and on main.

## QR-2 — Data durability and recovery

- **Requirement:** all bookings survive a full Postgres container restart,
  and a backup/restore cycle reproduces the exact pre-backup record set.
- **Threshold:** 0 missing or altered records (users, rooms, bookings).
- **Verification:** `scripts/backup.sh` -> `docker compose down` ->
  `docker compose up -d` -> `scripts/restore.sh`; the restore script prints
  record counts which must match the values recorded before backup. This is
  also the handover-drill restore check (lab section 11).

## QR-3 — Availability-search performance

- **Requirement:** with 1,000 bookings in the database,
  `GET /api/rooms?startTime&endTime` answers with p95 <= 1 second over 100
  sequential requests after a warm-up of 10 requests.
- **Conditions:** documented dev machine (record CPU/RAM in the results
  file), production build (`next build` + standalone), local Postgres 16.
- **Verification:** `scripts/perf-availability.ts` (BOOK-17, QA) — seeds the
  dataset, measures, and appends results to `docs/quality-results.md`.
