# API contract (v1.0)

Canonical description of the public operations: input, result, errors,
rights (lab section 5). Time format: ISO 8601 UTC on the wire; timestamps
are displayed in Europe/Kyiv in the UI. Every response carries an
`x-request-id` header for log correlation.

## GET /api/rooms

- **Auth:** none.
- **Input:** optional query `startTime`, `endTime` (ISO 8601).
- **Result 200:** `{ "rooms": [{ id, name, capacity, equipment, isAvailable? }] }`
  — `equipment` is a list of `PROJECTOR | COMPUTERS | WHITEBOARD`;
  `isAvailable` present only when both time params are given.
- **Errors:** 400 — only one time param, unparsable datetime, or
  `startTime >= endTime`.

## POST /api/bookings

- **Auth:** `x-user-id` header (seeded user).
- **Input:** `{ "roomId": string, "startTime": ISO, "endTime": ISO }`.
- **Result 201:** the created booking `{ id, roomId, roomName, userId,
  startTime, endTime, status: "ACTIVE", createdAt }`.
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
  released. Re-cancelling an already cancelled own booking is idempotent.
- **Errors:** 401 — missing/unknown `x-user-id`; 403 — non-owner; 404 —
  unknown booking id.

## GET /api/health

- **Auth:** none. **Result 200:** `{ status: "ok", database: "up" }`;
  **503:** `{ status: "degraded", database: "down" }`.
- Used by `scripts/smoke.sh` and the incident drill.
