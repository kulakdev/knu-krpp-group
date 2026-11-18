# Quality verification results

Entries are appended by the verification scripts; requirements and
conditions are in docs/quality-requirements.md.

## QR-3 — 2026-11-15T23:10:40.661Z

- Commit: 02dede8
- Target: http://127.0.0.1:3000
- Machine: Intel(R) Core(TM) i7-8850H CPU @ 2.60GHz, 12 cores, 16 GB RAM, darwin 24.6.0, Node v24.22.0
- Dataset: 1000 bookings over 3 rooms; warm-up 10, measured 100 sequential requests
- Query: GET /api/rooms?startTime=2030-02-05T04%3A00%3A00.000Z&endTime=2030-02-05T06%3A00%3A00.000Z
- Result: p50 4.3 ms, p95 5.0 ms, max 5.4 ms
- QR-3 (p95 <= 1000 ms): **PASS**

## QR-2 — 2026-11-16 / 2026-11-18

Data durability and recovery; conditions in docs/quality-requirements.md.

- **Container restart** (training incident, 2026-11-16, docs/incident-drill-2026-11-16.md):
  Postgres container stopped 22:29:36, started 22:31:03. `npm run data:check`
  after recovery equals the snapshot taken before the incident: 6 bookings
  (ACTIVE=4, CANCELLED=2), same key-fields fingerprint, invariants OK.
- **Backup / restore cycle** (2026-11-16, local main): training dataset of
  5 bookings in every v2.0 status, `scripts/backup.sh`, then
  `docker compose down -v` (volume removed), fresh setup per README,
  `scripts/restore.sh <backup>`. `data:check` before and after:
  ```text
  users=3 rooms=3 bookings=5
  by status: ACTIVE=2 CANCELLED=2 REJECTED=1
  key fields fingerprint: 7b6fbd338474134b
  invariants: OK
  ```
- **Restore from a clean clone** (2026-11-18, branch BOOK-51, commit c09304e):
  new working directory and new database volume, setup per README, restore
  of the same backup — identical `data:check` output.
- Machine: Intel(R) Core(TM) i7-8850H, 16 GB RAM, darwin 24.6.0, Node v24.22.0, Docker 29.1.5
- QR-2 (0 missing or altered records): **PASS**
