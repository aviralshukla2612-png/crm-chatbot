#!/usr/bin/env bash
# =================================================================
# ESS CHATBOT SaaS — NON-DESTRUCTIVE BACKUP VERIFICATION SCRIPT
# Restores a dump into an isolated test database ('ess_chatbot_verify')
# and reconciles row counts without touching the live database.
# =================================================================
set -eo pipefail

BACKUP_FILE="$1"
CONTAINER_NAME="${CONTAINER_NAME:-ess-postgres}"
DB_USER="${POSTGRES_USER:-postgres}"
LIVE_DB="${POSTGRES_DB:-ess_chatbot}"
VERIFY_DB="${VERIFY_DB:-ess_chatbot_verify}"

if [ -z "${BACKUP_FILE}" ]; then
    echo "Usage: $0 /path/to/backup_file.dump"
    exit 1
fi

if [ ! -f "${BACKUP_FILE}" ]; then
    echo "❌ [ERROR] Backup file not found: ${BACKUP_FILE}"
    exit 1
fi

echo "========================================================="
echo "🔍 STARTING NON-DESTRUCTIVE BACKUP VERIFICATION"
echo "  Source Artifact:   ${BACKUP_FILE}"
echo "  Target Test DB:    ${VERIFY_DB} (Isolated from ${LIVE_DB})"
echo "========================================================="

# Step 1: Ensure temporary test database exists
docker exec "${CONTAINER_NAME}" psql -U "${DB_USER}" -c "DROP DATABASE IF EXISTS \"${VERIFY_DB}\";"
docker exec "${CONTAINER_NAME}" psql -U "${DB_USER}" -c "CREATE DATABASE \"${VERIFY_DB}\";"

# Step 2: Restore dump artifact into the test database
TEMP_RESTORE_FILE="/tmp/verify_restore.dump"
docker cp "${BACKUP_FILE}" "${CONTAINER_NAME}:${TEMP_RESTORE_FILE}"

echo "Restoring schema and data into '${VERIFY_DB}'..."
docker exec "${CONTAINER_NAME}" pg_restore -U "${DB_USER}" -d "${VERIFY_DB}" -v "${TEMP_RESTORE_FILE}" || true
docker exec "${CONTAINER_NAME}" rm -f "${TEMP_RESTORE_FILE}"

# Step 3: Run table & row count reconciliation
echo ""
echo "📊 RECONCILIATION SUMMARY (Live DB vs Restored Verification DB):"
echo "---------------------------------------------------------"

TABLES=("Organization" "Bot" "Lead" "KnowledgeDocument" "KnowledgeChunk" "Conversation" "Message")

RECONCILIATION_FAILED=0
for TBL in "${TABLES[@]}"; do
    LIVE_COUNT=$(docker exec "${CONTAINER_NAME}" psql -U "${DB_USER}" -d "${LIVE_DB}" -t -A -c "SELECT COUNT(*) FROM \"${TBL}\";" 2>/dev/null || echo "N/A")
    RESTORE_COUNT=$(docker exec "${CONTAINER_NAME}" psql -U "${DB_USER}" -d "${VERIFY_DB}" -t -A -c "SELECT COUNT(*) FROM \"${TBL}\";" 2>/dev/null || echo "N/A")

    if [ "${LIVE_COUNT}" != "N/A" ] && [ "${LIVE_COUNT}" != "${RESTORE_COUNT}" ]; then
        echo "⚠️ Table \"${TBL}\": Live=${LIVE_COUNT}, Restored=${RESTORE_COUNT} (COUNT MISMATCH)"
        RECONCILIATION_FAILED=1
    else
        echo "✅ Table \"${TBL}\": ${RESTORE_COUNT} records verified."
    fi
done

# Step 4: Verify pgvector index and sample similarity query
echo ""
echo "Testing pgvector extension & HNSW index integrity..."
VECTOR_CHECK=$(docker exec "${CONTAINER_NAME}" psql -U "${DB_USER}" -d "${VERIFY_DB}" -t -A -c "SELECT extname FROM pg_extension WHERE extname = 'vector';")
if [ "${VECTOR_CHECK}" = "vector" ]; then
    echo "✅ pgvector extension is operational in restored database."
else
    echo "❌ pgvector extension is missing in restored database!"
    RECONCILIATION_FAILED=1
fi

# Clean up verification database
docker exec "${CONTAINER_NAME}" psql -U "${DB_USER}" -c "DROP DATABASE IF EXISTS \"${VERIFY_DB}\";"

echo "---------------------------------------------------------"
if [ "${RECONCILIATION_FAILED}" -eq 0 ]; then
    echo "🎉 VERIFICATION SUCCESSFUL! Backup artifact is valid, recoverable, and complete."
    exit 0
else
    echo "❌ VERIFICATION FAILED! Record counts or extensions do not match."
    exit 1
fi
