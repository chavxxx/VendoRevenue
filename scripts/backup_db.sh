#!/bin/bash
# GARTECH VENDO - Automated Database Backup Script
# Usage: ./backup_db.sh or schedule via cron: 0 2 * * * /opt/gartech/scripts/backup_db.sh

set -e

BACKUP_DIR="${BACKUP_DIR:-/Users/chavxxx/Documents/GARTECH/backups}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/gartech_db_backup_${TIMESTAMP}.sql"
GZ_FILE="${BACKUP_FILE}.gz"
RETENTION_DAYS=30

mkdir -p "$BACKUP_DIR"

echo "=== Starting GARTECH VENDO Database Backup ==="
echo "Timestamp: ${TIMESTAMP}"

# Check if running under Docker or local postgres
if docker ps | grep -q gartech_postgres; then
    echo "Dumping PostgreSQL from Docker container (gartech_postgres)..."
    docker exec -t gartech_postgres pg_dump -U gartech_admin -d gartech_vendo_db > "$BACKUP_FILE"
elif [ -f "./gartech_vendo.db" ]; then
    echo "Creating backup copy of local SQLite database..."
    cp ./gartech_vendo.db "${BACKUP_DIR}/gartech_sqlite_${TIMESTAMP}.db"
    gzip "${BACKUP_DIR}/gartech_sqlite_${TIMESTAMP}.db"
    echo "SQLite backup saved to: ${BACKUP_DIR}/gartech_sqlite_${TIMESTAMP}.db.gz"
    exit 0
else
    echo "Error: Neither gartech_postgres container nor local database found."
    exit 1
fi

# Compress dump
gzip "$BACKUP_FILE"
echo "Backup compressed successfully: ${GZ_FILE} ($(du -h "$GZ_FILE" | cut -f1))"

# Prune backups older than 30 days
echo "Pruning backups older than ${RETENTION_DAYS} days..."
find "$BACKUP_DIR" -type f -name "gartech_*.gz" -mtime +${RETENTION_DAYS} -exec rm -f {} +

echo "=== Database Backup Completed Successfully ==="
