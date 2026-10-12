#!/usr/bin/env bash
# =================================================================
# ESS CHATBOT SaaS — AUTOMATED POSTGRESQL BACKUP SCRIPT
# =================================================================
set -eo pipefail

BACKUP_DIR="${BACKUP_DIR:-/var/backups/ess_chatbot}"
CONTAINER_NAME="${CONTAINER_NAME:-ess-postgres}"
DB_NAME="${POSTGRES_DB:-ess_chatbot}"
DB_USER="${POSTGRES_USER:-postgres}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/${DB_NAME}_${TIMESTAMP}.dump"
TEMP_CONTAINER_FILE="/tmp/${DB_NAME}_${TIMESTAMP}.dump"

echo "[$(date -u +'%Y-%m-%dT%H:%M:%SZ')] Starting automated backup for database '${DB_NAME}'..."

# Ensure host backup directory exists with restricted permissions (0700)
mkdir -p "${BACKUP_DIR}"
chmod 700 "${BACKUP_DIR}"

# Step 1: Run pg_dump in custom format inside the container
if ! docker exec "${CONTAINER_NAME}" pg_dump -U "${DB_USER}" -d "${DB_NAME}" -F c -b -v -f "${TEMP_CONTAINER_FILE}"; then
    echo "❌ [ERROR] pg_dump failed inside container '${CONTAINER_NAME}'." >&2
    exit 1
fi

# Step 2: Copy backup artifact to durable host storage
if ! docker cp "${CONTAINER_NAME}:${TEMP_CONTAINER_FILE}" "${BACKUP_FILE}"; then
    echo "❌ [ERROR] Failed to copy backup artifact from container." >&2
    docker exec "${CONTAINER_NAME}" rm -f "${TEMP_CONTAINER_FILE}" || true
    exit 1
fi

# Clean up temp file in container
docker exec "${CONTAINER_NAME}" rm -f "${TEMP_CONTAINER_FILE}" || true

# Step 3: Validate backup file size (> 1KB)
if [ ! -s "${BACKUP_FILE}" ] || [ $(wc -c < "${BACKUP_FILE}") -lt 1024 ]; then
    echo "❌ [ERROR] Backup file '${BACKUP_FILE}' is empty or corrupt." >&2
    rm -f "${BACKUP_FILE}"
    exit 1
fi

chmod 600 "${BACKUP_FILE}"
FILE_SIZE=$(du -h "${BACKUP_FILE}" | cut -f1)
echo "✅ [SUCCESS] Backup created successfully: ${BACKUP_FILE} (${FILE_SIZE})"

# Step 4: Apply retention policy (keep at least 1 backup regardless of age)
TOTAL_BACKUPS=$(find "${BACKUP_DIR}" -type f -name "${DB_NAME}_*.dump" | wc -l)
if [ "${TOTAL_BACKUPS}" -gt 1 ]; then
    echo "Cleaning up backups older than ${RETENTION_DAYS} days..."
    find "${BACKUP_DIR}" -type f -name "${DB_NAME}_*.dump" -mtime "+${RETENTION_DAYS}" -exec rm -v {} \; || true
fi

echo "[$(date -u +'%Y-%m-%dT%H:%M:%SZ')] Backup routine completed."
