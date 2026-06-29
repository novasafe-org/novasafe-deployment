#!/bin/bash
# Delete rotated .gz log archives older than RETENTION_DAYS on the VPS.
# Cold storage beyond Grafana Cloud Loki retention (~14 days on free tier).
#
# Install cron (optional):
#   0 3 * * * root /opt/novasafe-deployment/infra/observability/scripts/prune-old-log-archives.sh >> /var/log/novasafe-log-prune.log 2>&1

set -euo pipefail

RETENTION_DAYS="${RETENTION_DAYS:-90}"
BASE="${NOVASAFE_DEPLOY_PATH:-/opt/novasafe-deployment}"

echo "=== Prune log archives older than ${RETENTION_DAYS} days ==="

prune_dir() {
  local dir="$1"
  if [ ! -d "${dir}" ]; then
    echo "SKIP: ${dir} (not found)"
    return 0
  fi

  local count
  count=$(find "${dir}" -maxdepth 1 -type f \( -name '*.gz' -o -name '*.log' \) -mtime "+${RETENTION_DAYS}" 2>/dev/null | wc -l | tr -d ' ')
  if [ "${count}" = "0" ]; then
    echo "OK: ${dir} — nothing to prune"
    return 0
  fi

  echo "Pruning ${count} file(s) in ${dir}"
  find "${dir}" -maxdepth 1 -type f \( -name '*.gz' -o -name '*.log' \) -mtime "+${RETENTION_DAYS}" -print -delete
}

prune_dir "${BASE}/mobile-api/logs"
prune_dir "${BASE}/platform/admin-api/logs"

echo "Done."
