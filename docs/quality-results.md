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
