#!/usr/bin/env bash
# Restores a backup produced by scripts/backup.sh and verifies record counts.
# Usage: scripts/restore.sh backups/backup_<timestamp>.sql
#
# The verification step is the handover-drill checkpoint (lab section 11):
# after restore, the expected seeded users/rooms must be present and the
# booking count must match the pre-backup state.
set -euo pipefail

FILE="${1:?Usage: $0 <backup-file.sql>}"

echo "== Wiping and restoring booking_db from $FILE"
docker compose exec -T db psql -v ON_ERROR_STOP=1 -U user -d booking_db < "$FILE"

echo "== Verification: record counts"
docker compose exec -T db psql -U user -d booking_db -c \
  "SELECT (SELECT count(*) FROM \"User\") AS users, (SELECT count(*) FROM \"Room\") AS rooms, (SELECT count(*) FROM \"Booking\") AS bookings;"

echo "== Expected: users=3, rooms=3, bookings=<count at backup time>"
echo "== Confirm the booking count against the value recorded before backup."
