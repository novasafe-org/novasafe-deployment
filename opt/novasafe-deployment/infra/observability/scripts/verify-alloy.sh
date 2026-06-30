#!/bin/bash
# Verify Grafana Alloy is running, config is current, and log files are visible.
# Run on VPS: bash /opt/novasafe-deployment/infra/observability/scripts/verify-alloy.sh

set -euo pipefail

CONTAINER="${NOVASAFE_ALLOY_CONTAINER:-novasafe-alloy}"
ALLOY_URL="${ALLOY_URL:-http://127.0.0.1:12345}"
ALLOY_DIR="${NOVASAFE_ALLOY_CONFIG:-/opt/novasafe-deployment/infra/observability/alloy}"
MOBILE_LOGS="${NOVASAFE_MOBILE_LOGS:-/opt/novasafe-deployment/mobile-api/logs}"
ADMIN_LOGS="${NOVASAFE_ADMIN_LOGS:-/opt/novasafe-deployment/platform/admin-api/logs}"

fail=0

echo "=== NovaSafe Alloy verification ==="

if ! docker ps --format '{{.Names}}' | grep -Fxq "${CONTAINER}"; then
  echo "FAIL: ${CONTAINER} is not running"
  exit 1
fi

status=$(docker inspect --format='{{.State.Status}}' "${CONTAINER}" 2>/dev/null || echo unknown)
if [ "${status}" != "running" ]; then
  echo "FAIL: ${CONTAINER} status=${status} (expected running)"
  fail=1
else
  echo "OK: ${CONTAINER} is running"
fi

if curl -sf "${ALLOY_URL}/-/ready" >/dev/null; then
  echo "OK: Alloy ready at ${ALLOY_URL}/-/ready"
else
  echo "WARN: Alloy ready check failed"
  fail=1
fi

echo ""
echo "--- Config on disk (must include local.file_match) ---"
if grep -q 'local.file_match' "${ALLOY_DIR}/mobile-api.alloy" 2>/dev/null; then
  echo "OK: mobile-api.alloy uses local.file_match"
else
  echo "FAIL: ${ALLOY_DIR}/mobile-api.alloy missing local.file_match — run ./deploy.sh sync"
  fail=1
fi

echo ""
echo "--- Host log files ---"
ls -la "${MOBILE_LOGS}"/app-*.log 2>/dev/null | tail -5 || echo "WARN: no mobile-api app-*.log on host"
ls -la "${ADMIN_LOGS}"/app-*.log 2>/dev/null | tail -5 || echo "WARN: no admin-api app-*.log on host"

echo ""
echo "--- Inside container ---"
docker exec "${CONTAINER}" ls -la /var/log/novasafe/mobile-api/app-*.log 2>/dev/null | tail -3 || echo "WARN: no files in container mobile-api mount"
docker exec "${CONTAINER}" ls -la /var/log/novasafe/admin-api/app-*.log 2>/dev/null | tail -3 || echo "WARN: no files in container admin-api mount"

echo ""
echo "--- Log schema (schema v1 JSON on disk) ---"
sample=""
for dir in "${MOBILE_LOGS}" "${ADMIN_LOGS}"; do
  latest=$(ls -t "${dir}"/app-*.log 2>/dev/null | head -1 || true)
  if [ -n "${latest}" ]; then
    sample=$(tail -1 "${latest}" 2>/dev/null || true)
    break
  fi
done
if [ -n "${sample}" ] && echo "${sample}" | grep -q '"schemaVersion"'; then
  echo "OK: latest log line is schema v1 JSON"
elif [ -n "${sample}" ] && echo "${sample}" | grep -q '^{'; then
  echo "WARN: JSON logs without schemaVersion — redeploy backend images"
else
  echo "WARN: logs are not JSON yet — redeploy mobile-api / admin-api"
fi

echo ""
echo "--- Alloy errors (stat failed = old config still loaded) ---"
if docker logs "${CONTAINER}" 2>&1 | tail -80 | grep -q 'failed to tail file, stat failed'; then
  echo "FAIL: stat failed errors present — recreate alloy:"
  echo "  cd /opt/novasafe-deployment/infra/observability && docker compose up -d --force-recreate"
  fail=1
else
  echo "OK: no recent stat-failed errors"
fi

if docker logs "${CONTAINER}" 2>&1 | tail -80 | grep -iE '401|403|unauthorized|forbidden' | head -3; then
  echo "FAIL: Loki auth errors — check infra/observability/.env"
  fail=1
fi

echo ""
echo "--- Recent Alloy logs ---"
docker logs --tail 15 "${CONTAINER}" 2>&1 || true

echo ""
if [ "${fail}" -eq 0 ]; then
  echo "OK: Verification passed"
  echo "Grafana Explore → grafanacloud-*-logs → {job=\"novasafe\"}"
else
  echo "FAIL: Fix issues above, then: docker compose up -d --force-recreate"
  exit 1
fi
