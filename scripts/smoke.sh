#!/usr/bin/env bash
# Post-deploy smoke check (lab section 7.3): exercises the full user path
# health -> create booking -> list -> cancel against a running instance.
# Usage: BASE_URL=http://localhost:3000 scripts/smoke.sh
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:3000}"
START="${SMOKE_START:-2030-01-05T10:00:00.000Z}"
END="${SMOKE_END:-2030-01-05T11:00:00.000Z}"

BOOKING_ID=""
cleanup() {
  # If the run was interrupted after creating a booking, release the slot so
  # the next smoke run does not fail with a 409 conflict.
  if [ -n "$BOOKING_ID" ]; then
    curl -sf -X DELETE "$BASE_URL/api/bookings/$BOOKING_ID" \
      -H "x-user-id: student-1" >/dev/null || true
  fi
}
trap cleanup EXIT

echo "== 1/4 health"
curl -sf "$BASE_URL/api/health" | grep -q '"status":"ok"' \
  && echo "   ok" || { echo "   FAILED: health check"; exit 1; }

echo "== 2/4 create booking"
RESPONSE=$(curl -sf -X POST "$BASE_URL/api/bookings" \
  -H "content-type: application/json" -H "x-user-id: student-1" \
  -d "{\"roomId\":\"room-101\",\"startTime\":\"$START\",\"endTime\":\"$END\"}")
BOOKING_ID=$(echo "$RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
[ -n "$BOOKING_ID" ] && echo "   created $BOOKING_ID" || { echo "   FAILED: create"; exit 1; }

echo "== 3/4 list bookings"
curl -sf "$BASE_URL/api/bookings" -H "x-user-id: student-1" \
  | grep -q "$BOOKING_ID" && echo "   listed" || { echo "   FAILED: list"; exit 1; }

echo "== 4/4 cancel booking"
curl -sf -X DELETE "$BASE_URL/api/bookings/$BOOKING_ID" -H "x-user-id: student-1" \
  | grep -q '"status":"CANCELLED"' && echo "   cancelled" || { echo "   FAILED: cancel"; exit 1; }
BOOKING_ID=""

echo "SMOKE OK"
