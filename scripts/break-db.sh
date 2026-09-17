#!/usr/bin/env bash
# Controlled fault injection for the training incident drill (lab section 8.3).
#
# Fault:        stops the Postgres container -> all DB-backed operations fail.
# Stop condition: drill facilitator ends the exercise, or 30 minutes elapsed.
# Recovery:     docker compose start db, then verify via /api/health and
#               scripts/smoke.sh; confirm data integrity with a booking count
#               compared against the pre-drill value.
#
# Only the drill facilitator runs this script; responders work from symptoms
# (failing health probe, error logs with request ids) without knowing the cause.
set -euo pipefail

echo "Injecting fault: stopping booking-db container."
echo "Revert with: docker compose start db"
docker compose stop db
echo "Fault active. /api/health should now report 503 degraded."
