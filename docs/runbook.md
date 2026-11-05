# Runbook: operations, diagnostics, recovery

Operational procedures. Setup/install instructions live in README.md —
this file covers running, diagnosing, and recovering the service.

## Starting the service

```bash
docker compose up -d db        # Postgres 16
npm run db:deploy              # apply migrations
npm run db:seed                # idempotent seed (3 users, 3 rooms)
npm run dev                    # or: node .next/standalone/server.js for the packaged build
```

## Diagnostics

- **Health probe:** `GET /api/health` — 200 ok / 503 database down.
- **Operation log:** every API call emits one JSON line with `requestId`,
  `op`, `userId`, `result`, `statusCode`, `durationMs`. Trace one failed
  operation across components with:
  ```bash
  npm run dev | grep <requestId>
  ```
  The failing response body and the `x-request-id` response header carry
  the same id.
- **Operation metrics (lab section 8.2):** capture the server log and
  aggregate it into 1-minute windows — ok/error counts, error rate and
  p50/p95 duration per operation:
  ```bash
  node .next/standalone/server.js 2>&1 | tee server.log
  npm run ops:report -- server.log            # --window <seconds>, default 60
  ```
  **Alert threshold:** a window is flagged `ALERT` when its error rate is
  above 50% with at least 3 requests, or when `/api/health` answered 503.
  During the incident drill the report shows the before / during / after
  windows; only the failure window should be flagged.
- **Common failure shapes:** 400 validation, 401 mock-auth, 403 ownership,
  404 unknown id, 409 slot conflict — all expected business outcomes, not
  technical faults. 5xx indicates a real defect or infrastructure issue.

## Smoke check (post-deploy / post-recovery)

```bash
BASE_URL=http://localhost:3000 scripts/smoke.sh
```

Exercises health -> create -> list -> cancel, then the v2.0 approval path
(large-room request -> PENDING -> admin approves -> ACTIVE -> cancel) and
must print `SMOKE OK`.

## Performance check (QR-3)

Run against the production build, never against data you need to keep —
`--reset` replaces all bookings with the 1,000-booking perf dataset:

```bash
npm run build
node .next/standalone/server.js            # separate terminal
BASE_URL=http://localhost:3000 npm run perf:availability -- --reset
```

Prints p50/p95/max and appends a dated entry (commit, machine, result) to
`docs/quality-results.md`; exits non-zero when p95 > 1 s.

## Backup and restore (QR-2)

```bash
scripts/backup.sh                      # writes backups/backup_<ts>.sql
scripts/restore.sh backups/<file>.sql  # restores + prints record counts
```

After restore, verify: users=3, rooms=3, bookings=<pre-backup count>.
`npm run data:check` prints the counts, bookings per status, a fingerprint of
the key booking fields and the no-overlap invariant — run it before the
backup and after the restore (or a migration) and compare the output.

## Rollback to a previous release

1. Download the desired CI artifact (`booking-app-<sha>.tar.gz`).
2. Stop the current server; unpack the artifact; `npm ci --omit=dev`.
3. `npx prisma migrate deploy` (safe only if the target release's schema
   matches the database — see the v2.0 migration notes before rolling back
   across schema versions; a rollback that requires data transformation is
   NOT safe and must not be promised).
4. Start: `node .next/standalone/server.js`; run `scripts/smoke.sh`.

## v2.0 migration and rollback limits (BOOK-23)

Upgrading v1.0 -> v2.0:

1. `scripts/backup.sh` and `npm run data:check` — keep both outputs.
2. Deploy the v2.0 artifact, `npx prisma migrate deploy` (applies
   `room_equipment` and `approval_workflow`: new enum values and nullable
   columns only — no existing row is rewritten).
3. `npm run data:check` again: counts, statuses and the key-fields
   fingerprint must equal step 1; no v1.0 booking gets a decision
   (no retroactive approval).
4. `scripts/smoke.sh` — includes the approval path.

Compatibility of the v1.0 build with v2.0 data — **rollback is limited**:

- The v1.0 code does not know `PENDING` / `REJECTED`. Once any booking is in
  one of these statuses, the v1.0 client fails to read it, and v1.0 treats
  only `ACTIVE` as blocking, so a pending request would stop reserving its
  slot. Rolling back the code alone is therefore **not safe** after the
  first large-room request.
- Rolling back the schema would require converting `PENDING` / `REJECTED`
  rows — a data transformation that loses the approval history. It is not
  offered.
- Supported rollback: restore the backup from step 1
  (`scripts/restore.sh`) together with the v1.0 artifact. Bookings created
  after the upgrade are lost and must be re-entered; announce that before
  rolling back.

## Incident drill quick reference (lab section 8.3)

- Fault injection (facilitator only): `scripts/break-db.sh`
- Recovery: `docker compose start db`, then health probe + smoke + booking
  count verification.
- Full drill plan, roles, and timeline template: Confluence "Ризики та
  інцидент" section.
