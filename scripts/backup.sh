#!/usr/bin/env bash
# Creates a timestamped SQL dump of booking_db into ./backups/
# (QR-2 durability evidence; also used by the handover drill, lab section 11).
set -euo pipefail

mkdir -p backups
FILE="backups/backup_$(date +%Y%m%d_%H%M%S).sql"

docker compose exec -T db pg_dump -U user -d booking_db --clean --if-exists > "$FILE"
echo "Backup written to $FILE"
