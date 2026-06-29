#!/bin/bash
# Verify Grafana Alloy is running and can reach Grafana Cloud Loki.
# Run on VPS: bash /opt/novasafe-deployment/infra/observability/scripts/verify-alloy.sh

set -euo pipefail

CONTAINER="${NOVASAFE_ALLOY_CONTAINER:-novasafe-alloy}"
ALLOY_URL="${ALLOY_URL:-http://127.0.0.1:12345}"

echo "=== NovaSafe Alloy verification ==="

if ! docker ps --format '{{.Names}}' | grep -Fxq "${CONTAINER}"; then
  echo "FAIL: ${CONTAINER} is not running"
  echo "Fix: cd /opt/novasafe-deployment/infra/observability && docker compose up -d"
  exit 1
fi
echo "OK: ${CONTAINER} is running"

if curl -sf "${ALLOY_URL}/-/ready" >/dev/null; then
  echo "OK: Alloy ready endpoint"
else
  echo "WARN: Alloy ready check failed at ${ALLOY_URL}/-/ready"
fi

echo ""
echo "Recent Alloy logs:"
docker logs --tail 20 "${CONTAINER}" 2>&1 || true

echo ""
echo "Next: Grafana Cloud → Explore → Loki"
echo '  Query: {job="novasafe", service="mobile-api"}'
echo '  Errors: {job="novasafe"} | json | level="error"'
