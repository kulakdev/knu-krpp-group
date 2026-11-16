# API contract (v1.0)

Canonical description of the public operations: input, result, errors,
rights (lab section 5). Time format: ISO 8601 UTC on the wire; timestamps
are displayed in Europe/Kyiv in the UI. Every response carries an
`x-request-id` header for log correlation.

Any operation may also fail with a technical error, body
`{ error, requestId }`: **503** `Database unavailable` — the database
cannot be reached; **500** `Internal server error` — any other unexpected
failure.

## GET /api/rooms

- **Auth:** none.
- **Input:** optional query `startTime`, `endTime` (ISO 8601) and
  `equipment` — comma-separated, case-insensitive `projector`, `computers`,
  `whiteboard`; only rooms having **all** listed items are returned.
- **Result 200:** `{ "rooms": [{ id, name, capacity, equipment, isAvailable? }] }`
  — `equipment` is a list of `PROJECTOR | COMPUTERS | WHITEBOARD`;
  `isAvailable` present only when both time params are given.
- **Errors:** 400 — only one time param, unparsable datetime,
  `startTime >= endTime`, or an empty / unknown equipment value.

## POST /api/bookings

- **Auth:** `x-user-id` header (seeded user).
- **Input:** `{ "roomId": string, "startTime": ISO, "endTime": ISO }`.
- **Result 201:** the created booking `{ id, roomId, roomName, userId,
  startTime, endTime, status, createdAt, decision, decidedById, decidedAt }`
  — `status` is `ACTIVE`, or `PENDING` for a room with capacity > 100
  (v2.0, waits for an admin decision); the decision fields are `null` until
  an admin decides.
- **Errors:** 400 — invalid body or interval; 401 — missing/unknown
  `x-user-id`; 404 — unknown room; 409 — overlapping active booking for
  that room.
- **Concurrency:** two simultaneous requests for the same room and
  overlapping slot produce exactly one 201 and one 409 (ADR-001).

## GET /api/bookings

- **Auth:** `x-user-id` header.
- **Result 200:** `{ "bookings": [...] }` — the requesting user's bookings,
  ACTIVE and CANCELLED, ordered by startTime.
- **Errors:** 401 — missing/unknown `x-user-id`.

## DELETE /api/bookings/:id

- **Auth:** `x-user-id` header.
- **Rights:** only the booking owner; enforced in server logic (QR-1).
- **Result 200:** the booking with `status: "CANCELLED"`; the slot is
  released. Works for `ACTIVE` and (v2.0) `PENDING` bookings — the owner
  withdraws the request. Re-cancelling an already cancelled own booking is
  idempotent.
- **Errors:** 401 — missing/unknown `x-user-id`; 403 — non-owner; 404 —
  unknown booking id; 409 — the booking was rejected (v2.0), or the booking
  changed meanwhile (concurrent admin decision).

## GET /api/admin/bookings (v2.0)

- **Auth:** `x-user-id` header of an admin.
- **Result 200:** `{ "bookings": [...] }` — PENDING requests with the
  booking fields plus `userName`, ordered by startTime.
- **Errors:** 401 — missing/unknown `x-user-id`; 403 — not an admin.

## POST /api/admin/bookings/:id/approve · /reject (v2.0)

- **Auth:** `x-user-id` header of an admin; rights enforced in server logic.
- **Result 200:** the booking — approve: `status: "ACTIVE"`,
  `decision: "APPROVED"`; reject: `status: "REJECTED"`,
  `decision: "REJECTED"` (the slot is released). `decidedById` and
  `decidedAt` record the author and time.
- **Repeated decision:** the same decision again returns 200 and changes
  nothing; the update is conditional on `PENDING`, so concurrent decisions
  cannot both apply.
- **Errors:** 401 — missing/unknown `x-user-id`; 403 — not an admin; 404 —
  unknown booking; 409 — not waiting for a decision (opposite decision
  already made, withdrawn by its owner, or never needed approval).

## GET /api/health

- **Auth:** none. **Result 200:** `{ status: "ok", database: "up" }`;
  **503:** `{ status: "degraded", database: "down" }`.
- Used by `scripts/smoke.sh` and the incident drill.
