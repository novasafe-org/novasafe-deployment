#!/bin/bash
#
# First boot — start the full stack once on a new server.
# Services that need .env are skipped until you copy those files (Step 3).
# Safe to re-run; marked complete with .novasafe-first-boot-done
#
# Env: same as deploy.sh (NOVASAFE_DEPLOY_PATH, NOVASAFE_DEPLOY_REPO, GHCR_*)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BASE_DIR="${NOVASAFE_DEPLOY_PATH:-/opt/novasafe-deployment}"
MARKER_FILE="${BASE_DIR}/.novasafe-first-boot-done"
DEPLOY_SH="${BASE_DIR}/deploy.sh"

# shellcheck source=lib/logging.sh
source "${SCRIPT_DIR}/lib/logging.sh"

log_banner "NovaSafe First Boot" "Starting the stack for the first time"

if [ -f "${MARKER_FILE}" ]; then
    log_ok "First boot already completed ($(cat "${MARKER_FILE}"))"
    log_info "Skipping — use deploy.sh <service> for individual updates"
    exit 0
fi

if [ ! -x "${DEPLOY_SH}" ]; then
    log_error "deploy.sh not found at ${DEPLOY_SH} — run initial-setup.sh first"
    exit 1
fi

# Order matters: nginx first, then backends, then frontends
BOOT_SEQUENCE=(
    "nginx:false"
    "backend:true"
    "mobile-api:true"
    "auth:true"
    "app:true"
    "landing:false"
    "mobile-landing:false"
    "portainer:false"
)

log_section "Boot sequence"
log_info "Services without .env will be skipped (copy .env files when ready)"

STARTED=0
SKIPPED=0
FAILED=0

for entry in "${BOOT_SEQUENCE[@]}"; do
    service="${entry%%:*}"
    needs_env="${entry##*:}"

    log_divider
    log_step "Service: ${service}"

    service_dir=""
    case "$service" in
        nginx)          service_dir="${BASE_DIR}/infra/nginx" ;;
        backend)        service_dir="${BASE_DIR}/platform/backend" ;;
        mobile-api)     service_dir="${BASE_DIR}/mobile-api" ;;
        auth)           service_dir="${BASE_DIR}/platform/auth" ;;
        app)            service_dir="${BASE_DIR}/platform/app" ;;
        landing)        service_dir="${BASE_DIR}/marketing/landing" ;;
        mobile-landing) service_dir="${BASE_DIR}/marketing/mobile-landing" ;;
        portainer)      service_dir="${BASE_DIR}/infra/portainer" ;;
    esac

    if [ "$needs_env" = "true" ] && [ ! -f "${service_dir}/.env" ]; then
        log_warn "Skipped ${service} — no .env at ${service_dir}/.env"
        SKIPPED=$((SKIPPED + 1))
        continue
    fi

    if ! NOVASAFE_DEPLOY_PATH="${BASE_DIR}" \
         NOVASAFE_DEPLOY_REPO="${NOVASAFE_DEPLOY_REPO:-/opt/novasafe-deployment-repo}" \
         NOVASAFE_SKIP_SYNC=true \
         NOVASAFE_IN_FIRST_BOOT=true \
         GHCR_TOKEN="${GHCR_TOKEN:-}" \
         GHCR_USER="${GHCR_USER:-}" \
         bash "${DEPLOY_SH}" "${service}"; then
        log_error "Failed to start ${service}"
        FAILED=$((FAILED + 1))
        # nginx failure is critical; others can be retried after .env is added
        if [ "$service" = "nginx" ]; then
            exit 1
        fi
        continue
    fi

    log_ok "${service} started"
    STARTED=$((STARTED + 1))
done

log_section "First boot summary"
log_summary_row "Started" "$STARTED"
log_summary_row "Skipped (no .env)" "$SKIPPED"
log_summary_row "Failed" "$FAILED"

date -u '+%Y-%m-%d %H:%M:%S UTC' > "${MARKER_FILE}"

if [ "$FAILED" -gt 0 ]; then
    log_warn "First boot finished with failures — fix .env/certs and redeploy failed services"
else
    log_ok "First boot complete"
fi

log_divider
