#!/usr/bin/env bash
# Post-deploy smoke check (lab section 7.3): exercises the full user path
# health -> create booking -> list -> cancel, and the v2.0 approval path
# large-room request -> PENDING -> admin approves -> ACTIVE -> cancel,
# against a running instance.
# Usage: BASE_URL=http://localhost:3000 scripts/smoke.sh
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:3000}"
START="${SMOKE_START:-2030-01-05T10:00:00.000Z}"
END="${SMOKE_END:-2030-01-05T11:00:00.000Z}"

BOOKING_ID=""
REQUEST_ID=""
cleanup() {
  # If the run was interrupted after creating a booking, release the slot so
  # the next smoke run does not fail with a 409 conflict. The owner can
  # cancel both ACTIVE and PENDING bookings.
  for id in "$BOOKING_ID" "$REQUEST_ID"; do
    if [ -n "$id" ]; then
      curl -sf -X DELETE "$BASE_URL/api/bookings/$id" \
        -H "x-user-id: student-1" >/dev/null || true
    fi
  done
}
trap cleanup EXIT

json_id() { grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4; }

echo "== 1/7 health"
curl -sf "$BASE_URL/api/health" | grep -q '"status":"ok"' \
  && echo "   ok" || { echo "   FAILED: health check"; exit 1; }

echo "== 2/7 create booking"
RESPONSE=$(curl -sf -X POST "$BASE_URL/api/bookings" \
  -H "content-type: application/json" -H "x-user-id: student-1" \
  -d "{\"roomId\":\"room-101\",\"startTime\":\"$START\",\"endTime\":\"$END\"}")
BOOKING_ID=$(echo "$RESPONSE" | json_id)
[ -n "$BOOKING_ID" ] && echo "   created $BOOKING_ID" || { echo "   FAILED: create"; exit 1; }

echo "== 3/7 list bookings"
curl -sf "$BASE_URL/api/bookings" -H "x-user-id: student-1" \
  | grep -q "$BOOKING_ID" && echo "   listed" || { echo "   FAILED: list"; exit 1; }

echo "== 4/7 cancel booking"
curl -sf -X DELETE "$BASE_URL/api/bookings/$BOOKING_ID" -H "x-user-id: student-1" \
  | grep -q '"status":"CANCELLED"' && echo "   cancelled" || { echo "   FAILED: cancel"; exit 1; }
BOOKING_ID=""

echo "== 5/7 request a large room (v2.0)"
RESPONSE=$(curl -sf -X POST "$BASE_URL/api/bookings" \
  -H "content-type: application/json" -H "x-user-id: student-1" \
  -d "{\"roomId\":\"hall-main\",\"startTime\":\"$START\",\"endTime\":\"$END\"}")
REQUEST_ID=$(echo "$RESPONSE" | json_id)
echo "$RESPONSE" | grep -q '"status":"PENDING"' && [ -n "$REQUEST_ID" ] \
  && echo "   pending $REQUEST_ID" || { echo "   FAILED: request is not PENDING"; exit 1; }

echo "== 6/7 admin approves"
curl -sf -X POST "$BASE_URL/api/admin/bookings/$REQUEST_ID/approve" -H "x-user-id: admin-1" \
  | grep -q '"decision":"APPROVED"' && echo "   approved" || { echo "   FAILED: approve"; exit 1; }

echo "== 7/7 cancel the approved booking"
curl -sf -X DELETE "$BASE_URL/api/bookings/$REQUEST_ID" -H "x-user-id: student-1" \
  | grep -q '"status":"CANCELLED"' && echo "   cancelled" || { echo "   FAILED: cancel"; exit 1; }
REQUEST_ID=""

echo "SMOKE OK"
