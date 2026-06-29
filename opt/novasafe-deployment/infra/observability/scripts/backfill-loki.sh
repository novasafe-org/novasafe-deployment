#!/bin/bash
# One-time backfill: push recent .gz archives into Grafana Cloud Loki.
# Only useful for logs still inside your Loki retention window (~14 days on free tier).
#
# Requires: infra/observability/.env with LOKI_URL, LOKI_USERNAME, LOKI_PASSWORD
#
# Usage:
#   BACKFILL_DAYS=14 bash backfill-loki.sh mobile-api
#   BACKFILL_DAYS=7  bash backfill-loki.sh admin-api

set -euo pipefail

SERVICE="${1:-}"
BACKFILL_DAYS="${BACKFILL_DAYS:-14}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OBS_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
BASE="${NOVASAFE_DEPLOY_PATH:-/opt/novasafe-deployment}"

if [ -z "${SERVICE}" ]; then
  echo "Usage: BACKFILL_DAYS=14 $0 <mobile-api|admin-api>"
  exit 1
fi

case "${SERVICE}" in
  mobile-api) LOG_DIR="${BASE}/mobile-api/logs" ;;
  admin-api)  LOG_DIR="${BASE}/platform/admin-api/logs" ;;
  *)
    echo "Unknown service: ${SERVICE}"
    exit 1
    ;;
esac

ENV_FILE="${OBS_DIR}/.env"
if [ ! -f "${ENV_FILE}" ]; then
  echo "Missing ${ENV_FILE} — copy .env.example and add Loki credentials"
  exit 1
fi

# shellcheck disable=SC1090
set -a
source "${ENV_FILE}"
set +a

if [ -z "${LOKI_URL:-}" ] || [ -z "${LOKI_USERNAME:-}" ] || [ -z "${LOKI_PASSWORD:-}" ]; then
  echo "LOKI_URL, LOKI_USERNAME, LOKI_PASSWORD must be set in ${ENV_FILE}"
  exit 1
fi

echo "=== Backfill ${SERVICE} — last ${BACKFILL_DAYS} days from ${LOG_DIR} ==="

shopt -s nullglob
files=("${LOG_DIR}"/app-*.log.gz)
shopt -u nullglob

if [ "${#files[@]}" -eq 0 ]; then
  echo "No .gz archives found in ${LOG_DIR}"
  exit 0
fi

pushed=0
skipped=0

for gz in "${files[@]}"; do
  base=$(basename "${gz}")
  # app-2026-06-17.log.gz → 2026-06-17
  day="${base#app-}"
  day="${day%.log.gz}"

  if ! date -j -f "%Y-%m-%d" "${day}" "+%s" >/dev/null 2>&1; then
    # GNU date fallback
    if ! day_epoch=$(date -d "${day}" "+%s" 2>/dev/null); then
      echo "SKIP: cannot parse date from ${base}"
      skipped=$((skipped + 1))
      continue
    fi
  else
    day_epoch=$(date -j -f "%Y-%m-%d" "${day}" "+%s")
  fi

  cutoff_epoch=$(date -v-"${BACKFILL_DAYS}"d "+%s" 2>/dev/null || date -d "${BACKFILL_DAYS} days ago" "+%s")
  if [ "${day_epoch}" -lt "${cutoff_epoch}" ]; then
    skipped=$((skipped + 1))
    continue
  fi

  LOKI_ADDR="${LOKI_URL%/loki/api/v1/push}"
  echo "Pushing ${base}..."
  gunzip -c "${gz}" | docker run --rm -i \
    -e LOKI_ADDR \
    -e LOKI_USERNAME \
    -e LOKI_PASSWORD \
    grafana/logcli:3.4.2 \
    push \
    --label=job=novasafe \
    --label=service="${SERVICE}" \
    --label=environment="${ENVIRONMENT:-production}" \
    --label=backfill=true \
    -

  pushed=$((pushed + 1))
done

echo "Backfill complete — pushed: ${pushed}, skipped: ${skipped}"
