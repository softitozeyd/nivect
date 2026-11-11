#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
umask 077
mkdir -p runtime/backups
archive="runtime/backups/nivect-$(date -u +%Y%m%dT%H%M%SZ).dump"
docker compose exec -T postgres sh -ec 'exec pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' > "$archive"
docker compose exec -T postgres pg_restore --list < "$archive" > /dev/null
printf 'Verified archive: %s\n' "$archive"
