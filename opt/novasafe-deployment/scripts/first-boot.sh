#!/bin/bash
#
# First boot — start stack once. Skips services without .env or already healthy.
# Safe to re-run.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BASE_DIR="${NOVASAFE_DEPLOY_PATH:-/opt/novasafe-deployment}"
MARKER_FILE="${BASE_DIR}/.novasafe-first-boot-done"
DEPLOY_SH="${BASE_DIR}/deploy.sh"

# shellcheck source=lib/logging.sh
source "${SCRIPT_DIR}/lib/logging.sh"
# shellcheck source=lib/common.sh
source "${SCRIPT_DIR}/lib/common.sh"

log_banner "NovaSafe First Boot" "Starting the stack for the first time"

if [ -f "${MARKER_FILE}" ]; then
    log_ok "First boot already completed ($(cat "${MARKER_FILE}"))"
    exit 0
fi

if [ ! -f "${DEPLOY_SH}" ]; then
    log_error "deploy.sh not found at ${DEPLOY_SH} — run initial-setup.sh first"
    exit 1
fi

BOOT_SEQUENCE=(
    "nginx:false:novasafe-nginx"
    "mobile-api:true:novasafe-mobile-vault"
    "auth:true:novasafe-auth"
    "app:true:novasafe-app"
    "landing:false:novasafe-landing"
    "mobile-landing:false:mobile-landing"
    "portainer:false:portainer"
)

log_section "Boot sequence"
log_info "Skips: missing .env · already-running healthy containers"

STARTED=0
SKIPPED=0
FAILED=0
ALREADY=0

for entry in "${BOOT_SEQUENCE[@]}"; do
    IFS=':' read -r service needs_env container <<< "${entry}"

    log_divider
    log_step "Service: ${service}"

    service_dir=""
    case "$service" in
        nginx)          service_dir="${BASE_DIR}/infra/nginx" ;;
        mobile-api)     service_dir="${BASE_DIR}/mobile-api" ;;
        auth)           service_dir="${BASE_DIR}/platform/auth" ;;
        app)            service_dir="${BASE_DIR}/platform/app" ;;
        landing)        service_dir="${BASE_DIR}/marketing/landing" ;;
        mobile-landing) service_dir="${BASE_DIR}/marketing/mobile-landing" ;;
        portainer)      service_dir="${BASE_DIR}/infra/portainer" ;;
    esac

    if [ ! -f "${service_dir}/docker-compose.yml" ]; then
        log_warn "Skipped ${service} — no docker-compose.yml in ${service_dir}"
        SKIPPED=$((SKIPPED + 1))
        continue
    fi

    if [ "$needs_env" = "true" ] && ! env_file_present "${service_dir}"; then
        log_warn "Skipped ${service} — no .env at ${service_dir}/.env"
        SKIPPED=$((SKIPPED + 1))
        continue
    fi

    if container_is_running "${container}"; then
        STATUS=$(docker inspect --format='{{.State.Status}}' "${container}" 2>/dev/null || echo unknown)
        log_ok "Already running: ${container} (${STATUS}) — refreshing image"
        ALREADY=$((ALREADY + 1))
    fi

    if ! NOVASAFE_DEPLOY_PATH="${BASE_DIR}" \
         NOVASAFE_DEPLOY_REPO="${NOVASAFE_DEPLOY_REPO:-/opt/novasafe-deployment-repo}" \
         NOVASAFE_SKIP_SYNC=true \
         NOVASAFE_IN_FIRST_BOOT=true \
         GHCR_TOKEN="${GHCR_TOKEN:-}" \
         GHCR_USER="${GHCR_USER:-}" \
         bash "${DEPLOY_SH}" "${service}"; then
        if [ "${service}" = "nginx" ] && container_is_running "novasafe-nginx"; then
            log_warn "nginx deploy reported issues but container is running — continuing first boot"
            log_info "Run ./deploy.sh nginx-reload after all services are up"
        else
            log_error "Failed: ${service}"
            FAILED=$((FAILED + 1))
            if [ "${service}" = "nginx" ]; then
                exit 1
            fi
            continue
        fi
    fi

    log_ok "${service} ready"
    STARTED=$((STARTED + 1))
done

log_section "First boot summary"
log_summary_row "Started/updated" "$STARTED"
log_summary_row "Already running" "$ALREADY"
log_summary_row "Skipped" "$SKIPPED"
log_summary_row "Failed" "$FAILED"

if container_is_running "novasafe-nginx"; then
    log_step "Reloading nginx after boot sequence"
    NOVASAFE_DEPLOY_PATH="${BASE_DIR}" \
    NOVASAFE_SKIP_SYNC=true \
    NOVASAFE_IN_FIRST_BOOT=true \
    bash "${DEPLOY_SH}" nginx-reload 2>/dev/null || \
        log_warn "nginx-reload deferred — run ./deploy.sh nginx-reload when all upstreams are ready"
fi

date -u '+%Y-%m-%d %H:%M:%S UTC' > "${MARKER_FILE}"

if [ "$FAILED" -gt 0 ]; then
    log_warn "Some services failed — add .env/certs and redeploy those services"
else
    log_ok "First boot complete"
fi

log_divider
