#!/bin/bash
# GARTECH VENDO - Database Restore Script
# Usage: ./restore_db.sh /path/to/backup.sql.gz

set -e

BACKUP_PATH="$1"

if [ -z "$BACKUP_PATH" ] || [ ! -f "$BACKUP_PATH" ]; then
    echo "Usage: $0 <path_to_backup_file.sql.gz>"
    echo "Available backups:"
    ls -lh ../backups/gartech_*.gz 2>/dev/null || ls -lh ./backups/gartech_*.gz 2>/dev/null || echo "No backups found."
    exit 1
fi

echo "=========================================================="
echo "WARNING: You are about to restore the database from:"
echo "  $BACKUP_PATH"
echo "All current database records will be overwritten!"
echo "=========================================================="
read -p "Type 'RESTORE' to confirm: " CONFIRM

if [ "$CONFIRM" != "RESTORE" ]; then
    echo "Restore aborted."
    exit 0
fi

echo "Decompressing backup..."
TEMP_SQL=$(mktemp /tmp/gartech_restore_XXXXXX.sql)

if [[ "$BACKUP_PATH" == *.gz ]]; then
    gunzip -c "$BACKUP_PATH" > "$TEMP_SQL"
else
    cp "$BACKUP_PATH" "$TEMP_SQL"
fi

if docker ps | grep -q gartech_postgres; then
    echo "Restoring into gartech_postgres container..."
    docker exec -i gartech_postgres psql -U gartech_admin -d gartech_vendo_db < "$TEMP_SQL"
    echo "Database restore completed successfully!"
else
    echo "gartech_postgres container is not running. Please start it with: docker compose up -d postgres"
    rm -f "$TEMP_SQL"
    exit 1
fi

rm -f "$TEMP_SQL"
echo "Restore operation finished successfully."
