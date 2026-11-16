#!/usr/bin/env bash
# Dumps the production database to a timestamped, compressed file.
# Run from anywhere on the server; it locates the project folder itself.
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
BACKUP_DIR="${BACKUP_DIR:-$HOME/backups}"
KEEP_DAYS="${KEEP_DAYS:-14}"
COMPOSE="docker compose -f compose.base.yaml -f compose.prod.yaml"

cd "$PROJECT_DIR"

# Reads POSTGRES_USER and POSTGRES_DB from the production database env file
set -a
. ./db/.env.prod
set +a

mkdir -p "$BACKUP_DIR"
STAMP="$(date +%Y%m%d-%H%M%S)"
FILE="$BACKUP_DIR/ascii_db-$STAMP.dump"

# -Fc writes a compressed custom-format archive, which pg_restore can read
if ! $COMPOSE exec -T ascii-db pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc > "$FILE"; then
    rm -f "$FILE"
    echo "Backup failed: pg_dump returned an error" >&2
    exit 1
fi

if [ ! -s "$FILE" ]; then
    rm -f "$FILE"
    echo "Backup failed: the dump file is empty" >&2
    exit 1
fi

# Delete backups older than KEEP_DAYS
find "$BACKUP_DIR" -name 'ascii_db-*.dump' -mtime +"$KEEP_DAYS" -delete

echo "Backup written: $FILE"
