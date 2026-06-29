#!/bin/bash
#
# NovaSafe VPS deployment helper.
# Run on the server at /opt/novasafe-deployment/deploy.sh
#
# Safe to re-run: skips or tolerates anything already present.
#
# Environment (optional — sensible defaults for Hostinger layout):
#   NOVASAFE_DEPLOY_PATH  → /opt/novasafe-deployment   (live config + compose)
#   NOVASAFE_DEPLOY_REPO  → /opt/novasafe-deployment-repo (git clone of this repo)
#   GHCR_TOKEN / GHCR_USER → docker login before pull (set by CI)
#   NOVASAFE_SKIP_SYNC    → skip git pull + rsync (set by CI after sync)
#   NOVASAFE_IN_FIRST_BOOT → internal flag to avoid nested first-boot

set -euo pipefail

REPO_ROOT="${NOVASAFE_DEPLOY_REPO:-/opt/novasafe-deployment-repo}"
BASE_DIR="${NOVASAFE_DEPLOY_PATH:-/opt/novasafe-deployment}"
SCRIPTS_DIR="${BASE_DIR}/scripts"

LANDING_DIR="$BASE_DIR/marketing/landing"
MOBILE_LANDING_DIR="$BASE_DIR/marketing/mobile-landing"
AUTH_DIR="$BASE_DIR/platform/auth"
APP_DIR="$BASE_DIR/platform/app"
MOBILE_API_DIR="$BASE_DIR/mobile-api"
ADMIN_API_DIR="$BASE_DIR/platform/admin-api"
NGINX_DIR="$BASE_DIR/infra/nginx"
OBSERVABILITY_DIR="$BASE_DIR/infra/observability"

SERVICE="${1:-}"

if [ -f "${SCRIPTS_DIR}/lib/logging.sh" ]; then
    # shellcheck source=scripts/lib/logging.sh
    source "${SCRIPTS_DIR}/lib/logging.sh"
else
    log_banner() { echo "=== $1 ==="; }
    log_section() { echo "--- $1 ---"; }
    log_step() { echo "> $1"; }
    log_info() { echo "  $1"; }
    log_ok() { echo "OK: $1"; }
    log_warn() { echo "WARN: $1"; }
    log_error() { echo "ERROR: $1"; }
    log_cmd() { echo "  $ $1"; }
    log_divider() { echo "----------"; }
    log_summary_row() { echo "  $1: $2"; }
fi

if [ -f "${SCRIPTS_DIR}/lib/common.sh" ]; then
    # shellcheck source=scripts/lib/common.sh
    source "${SCRIPTS_DIR}/lib/common.sh"
else
    command_exists() { command -v "$1" >/dev/null 2>&1; }
    ensure_docker_network() { docker network create "${1:-novasafe-network}" 2>/dev/null || true; }
    connect_network_if_needed() {
        docker network connect "$1" "$2" 2>/dev/null || true
    }
    container_is_running() {
        docker ps --format '{{.Names}}' | grep -Fxq "$1"
    }
    container_is_stable() {
        local status restarting
        status=$(docker inspect --format='{{.State.Status}}' "$1" 2>/dev/null || echo missing)
        restarting=$(docker inspect --format='{{.State.Restarting}}' "$1" 2>/dev/null || echo true)
        [ "${status}" = "running" ] && [ "${restarting}" = "false" ]
    }
    wait_for_container_stable() {
        local i
        for i in $(seq 1 "${2:-30}"); do
            container_is_stable "$1" && return 0
            sleep 1
        done
        return 1
    }
    env_file_present() { [ -f "${1}/.env" ]; }
    ensure_directory() { mkdir -p "$1"; }
    ensure_file_executable() { [ -f "$1" ] && chmod +x "$1" 2>/dev/null || true; }
fi

is_server_ready() {
    [ -f "${BASE_DIR}/deploy.sh" ] \
        && [ -f "${BASE_DIR}/platform/app/docker-compose.yml" ] \
        && [ -f "${BASE_DIR}/.novasafe-initial-setup-done" ] \
        && command_exists docker \
        && docker network inspect novasafe-network >/dev/null 2>&1
}

ensure_ready() {
    log_banner "NovaSafe Pre-flight" "Checking server readiness"

    if ! is_server_ready; then
        log_section "Initial setup required"
        log_warn "Fresh or incomplete server detected — running initial-setup.sh"

        if [ -f "${SCRIPTS_DIR}/initial-setup.sh" ]; then
            NOVASAFE_DEPLOY_PATH="${BASE_DIR}" \
            NOVASAFE_DEPLOY_REPO="${REPO_ROOT}" \
            bash "${SCRIPTS_DIR}/initial-setup.sh"
        elif [ -f "/tmp/novasafe-scripts/initial-setup.sh" ]; then
            NOVASAFE_DEPLOY_PATH="${BASE_DIR}" \
            NOVASAFE_DEPLOY_REPO="${REPO_ROOT}" \
            bash "/tmp/novasafe-scripts/initial-setup.sh"
        else
            log_error "initial-setup.sh not found — sync deployment repo first"
            exit 1
        fi
    else
        log_ok "Initial setup already complete"
    fi

    if [ ! -f "${BASE_DIR}/.novasafe-first-boot-done" ]; then
        if [ "${NOVASAFE_IN_FIRST_BOOT:-}" = "true" ]; then
            log_info "First boot already in progress — skipping nested run"
        else
            log_section "First boot required"
            log_warn "Stack not started yet — running first-boot.sh"

            if [ -f "${SCRIPTS_DIR}/first-boot.sh" ]; then
                NOVASAFE_DEPLOY_PATH="${BASE_DIR}" \
                NOVASAFE_DEPLOY_REPO="${REPO_ROOT}" \
                GHCR_TOKEN="${GHCR_TOKEN:-}" \
                GHCR_USER="${GHCR_USER:-}" \
                bash "${SCRIPTS_DIR}/first-boot.sh"
            elif [ -f "/tmp/novasafe-scripts/first-boot.sh" ]; then
                NOVASAFE_DEPLOY_PATH="${BASE_DIR}" \
                NOVASAFE_DEPLOY_REPO="${REPO_ROOT}" \
                GHCR_TOKEN="${GHCR_TOKEN:-}" \
                GHCR_USER="${GHCR_USER:-}" \
                bash "/tmp/novasafe-scripts/first-boot.sh"
            else
                log_error "first-boot.sh not found"
                exit 1
            fi
        fi
    else
        log_ok "First boot already complete"
    fi

    log_ok "Server is ready to deploy"
    log_divider
}

detect_compose() {
    if docker compose version >/dev/null 2>&1; then
        DC="docker compose"
    elif command_exists docker-compose; then
        DC="docker-compose"
    else
        log_error "Neither 'docker compose' nor 'docker-compose' found"
        exit 1
    fi
}

ghcr_login() {
    if [ -z "${GHCR_TOKEN:-}" ] || [ -z "${GHCR_USER:-}" ]; then
        log_info "GHCR credentials not set — using existing docker login (if any)"
        return 0
    fi

    log_step "Logging into GHCR as ${GHCR_USER}"
    if echo "${GHCR_TOKEN}" | docker login ghcr.io -u "${GHCR_USER}" --password-stdin 2>/dev/null; then
        log_ok "GHCR login successful"
    else
        log_warn "GHCR login failed — continuing (image pull may still work if already authenticated)"
    fi
}

sync_config() {
    log_section "Sync deployment config"

    if [ ! -d "${REPO_ROOT}/.git" ]; then
        log_error "Git repo not found at ${REPO_ROOT}"
        log_info "Run: ./deploy.sh ensure-ready  (or initial-setup.sh on a fresh server)"
        exit 1
    fi

    log_step "Pulling latest from Git"
    cd "${REPO_ROOT}"
    git fetch origin -q 2>/dev/null || log_warn "git fetch failed — using local copy"
    git pull origin master 2>/dev/null || git pull origin main 2>/dev/null || log_warn "git pull failed — using local copy"

    ensure_directory "${BASE_DIR}"
    rsync -a \
        --exclude '.env' \
        --exclude '.env.*' \
        --exclude '**/.env' \
        --exclude '**/.env.*' \
        --exclude 'logs/' \
        --exclude '**/logs/' \
        --exclude '.novasafe-initial-setup-done' \
        --exclude '.novasafe-first-boot-done' \
        "${REPO_ROOT}/opt/novasafe-deployment/" "${BASE_DIR}/"

    ensure_file_executable "${BASE_DIR}/deploy.sh"
    for f in "${BASE_DIR}/scripts/"*.sh "${BASE_DIR}/scripts/lib/"*.sh; do
        ensure_file_executable "$f"
    done

    log_ok "Config synced to ${BASE_DIR}"
}

require_env_file() {
    local dir="$1"
    local mode="${2:-fail}"

    if env_file_present "${dir}"; then
        return 0
    fi

    if [ "${mode}" = "skip" ]; then
        log_warn "Skipped — no .env in ${dir}"
        return 1
    fi

    log_error ".env missing in ${dir}"
    log_info "Copy production .env to the server (see README Step 3), then redeploy."
    exit 1
}

compose_file_present() {
    [ -f "${1}/docker-compose.yml" ] || [ -f "${1}/docker-compose.yaml" ]
}

deploy_compose_dir() {
    local dir="$1"
    local container="$2"
    local needs_env="${3:-false}"
    local env_mode="${4:-fail}"

    log_section "Deploy ${container}"
    log_info "Directory: ${dir}"

    if [ ! -d "${dir}" ]; then
        log_error "Directory not found: ${dir}"
        exit 1
    fi

    if ! compose_file_present "${dir}"; then
        log_error "No docker-compose.yml in ${dir}"
        exit 1
    fi

    if [ "${needs_env}" = "true" ]; then
        require_env_file "${dir}" "${env_mode}" || return 0
    fi

    cd "${dir}"
    detect_compose
    ghcr_login

    if container_is_running "${container}"; then
        log_ok "Container ${container} already running — pulling latest image and recreating"
    fi

    log_step "Pulling latest image"
    if ! $DC pull; then
        log_warn "Image pull failed — attempting up with existing image"
    fi

    log_step "Recreating container"
    $DC up -d --remove-orphans

    log_step "Container status"
    docker ps --filter "name=${container}" --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}' || true

    log_step "Recent logs (last 30 lines)"
    docker logs --tail 30 "${container}" 2>/dev/null || true

    log_ok "${container} deployed"
}

nginx_certs_present() {
    local cert_dir="${NGINX_DIR}/cloudflare"
    [ -f "${cert_dir}/origin.key" ] \
        && { [ -f "${cert_dir}/origin.crt" ] || [ -f "${cert_dir}/origin.pem" ]; }
}

wait_for_nginx_exec() {
    local i
    for i in $(seq 1 15); do
        if docker exec novasafe-nginx nginx -v >/dev/null 2>&1; then
            return 0
        fi
        sleep 1
    done
    return 1
}

reload_nginx_if_running() {
    local strict="${1:-false}"

    if ! container_is_running "novasafe-nginx"; then
        log_warn "novasafe-nginx not running — skipping reload"
        return 0
    fi

    if ! wait_for_nginx_exec; then
        log_warn "nginx not ready for exec yet — skipping reload"
        return 0
    fi

    log_step "Validating nginx configuration"
    local test_output=""
    if ! test_output=$(docker exec novasafe-nginx nginx -t 2>&1); then
        log_warn "nginx -t failed:"
        while IFS= read -r line; do
            [ -n "${line}" ] && log_info "  ${line}"
        done <<< "${test_output}"

        if [ "${strict}" = "true" ]; then
            return 1
        fi
        log_warn "Skipping reload — run ./deploy.sh nginx-reload after certs/upstreams are ready"
        return 0
    fi
    log_ok "nginx config valid"

    if docker exec novasafe-nginx nginx -s reload 2>/dev/null; then
        log_ok "Nginx reloaded"
    else
        log_warn "nginx reload failed — container may already be serving the latest config"
    fi
}

deploy_nginx() {
    local was_running=false
    if container_is_running "novasafe-nginx"; then
        was_running=true
    fi

    if ! nginx_certs_present; then
        log_warn "Cloudflare origin certs missing in ${NGINX_DIR}/cloudflare/"
        log_warn "Place origin.crt (or origin.pem) and origin.key before HTTPS works"
    fi

    deploy_compose_dir "${NGINX_DIR}" "novasafe-nginx" false

    log_step "Waiting for nginx container to stabilize"
    if ! wait_for_container_stable "novasafe-nginx" 30; then
        log_error "nginx is crash-looping — likely bad config or missing TLS files"
        log_step "Recent nginx logs"
        docker logs --tail 60 novasafe-nginx 2>/dev/null || true
        if [ "${NOVASAFE_IN_FIRST_BOOT:-}" = "true" ]; then
            log_warn "Continuing first boot — fix nginx config/certs and redeploy nginx"
            return 0
        fi
        return 1
    fi
    log_ok "nginx container is running"

    # Fresh `up -d` already starts nginx with the synced config — reload is redundant
    # on first boot when upstream app containers may not exist yet.
    if [ "${was_running}" = "true" ]; then
        reload_nginx_if_running false
    else
        log_info "Fresh nginx container — skipping reload"
        if wait_for_nginx_exec && docker exec novasafe-nginx nginx -t >/dev/null 2>&1; then
            log_ok "nginx config valid"
        else
            log_warn "nginx config test skipped or deferred — run ./deploy.sh nginx-reload after all services are up"
        fi
    fi
}

deploy_mobile_api() {
    deploy_compose_dir "${MOBILE_API_DIR}" "novasafe-mobile-vault" true

    ensure_docker_network novasafe-network
    connect_network_if_needed novasafe-network novasafe-nginx
    connect_network_if_needed novasafe-network novasafe-mobile-vault

    if ! container_is_running "novasafe-mobile-vault"; then
        log_warn "novasafe-mobile-vault not running — skipping health wait"
        return 0
    fi

    log_step "Waiting for health (up to 90s)"
    for i in $(seq 1 18); do
        STATUS=$(docker inspect --format='{{.State.Health.Status}}' novasafe-mobile-vault 2>/dev/null || echo "unknown")
        log_info "Health check ${i}/18 — status: ${STATUS}"
        if [ "${STATUS}" = "healthy" ]; then
            log_ok "Container is healthy"
            break
        fi
        if [ "${STATUS}" = "none" ] || [ "${STATUS}" = "unknown" ]; then
            log_info "No healthcheck defined — treating as ready"
            break
        fi
        if [ "${i}" -eq 18 ]; then
            log_error "Health check did not pass (status=${STATUS})"
            docker logs --tail 80 novasafe-mobile-vault || true
            exit 1
        fi
        sleep 5
    done

    reload_nginx_if_running
}

deploy_observability() {
    deploy_compose_dir "${OBSERVABILITY_DIR}" "novasafe-alloy" true
}

deploy_admin_api() {
    deploy_compose_dir "${ADMIN_API_DIR}" "novasafe-admin-api" true

    ensure_docker_network novasafe-network
    connect_network_if_needed novasafe-network novasafe-nginx
    connect_network_if_needed novasafe-network novasafe-admin-api

    if ! container_is_running "novasafe-admin-api"; then
        log_warn "novasafe-admin-api not running — skipping health wait"
        return 0
    fi

    log_step "Waiting for health (up to 90s)"
    for i in $(seq 1 18); do
        STATUS=$(docker inspect --format='{{.State.Health.Status}}' novasafe-admin-api 2>/dev/null || echo "unknown")
        log_info "Health check ${i}/18 — status: ${STATUS}"
        if [ "${STATUS}" = "healthy" ]; then
            log_ok "Container is healthy"
            break
        fi
        if [ "${STATUS}" = "none" ] || [ "${STATUS}" = "unknown" ]; then
            log_info "No healthcheck defined — treating as ready"
            break
        fi
        if [ "${i}" -eq 18 ]; then
            log_error "Health check did not pass (status=${STATUS})"
            docker logs --tail 80 novasafe-admin-api || true
            exit 1
        fi
        sleep 5
    done

    reload_nginx_if_running
}

nginx_reload() {
    if ! container_is_running "novasafe-nginx"; then
        log_error "novasafe-nginx is not running"
        exit 1
    fi
    reload_nginx_if_running true
}

run_service_deploy() {
    local target="$1"

    log_banner "NovaSafe Deploy" "Service: ${target}"
    log_summary_row "Deploy path" "${BASE_DIR}"
    log_summary_row "Triggered service" "${target}"

    if [ "${NOVASAFE_IN_FIRST_BOOT:-}" != "true" ]; then
        ensure_ready
    fi

    case "${target}" in
        landing)        deploy_compose_dir "${LANDING_DIR}" "novasafe-landing" false ;;
        mobile-landing) deploy_compose_dir "${MOBILE_LANDING_DIR}" "mobile-landing" false ;;
        auth)           deploy_compose_dir "${AUTH_DIR}" "novasafe-auth" true ;;
        app)            deploy_compose_dir "${APP_DIR}" "novasafe-app" true ;;
        mobile-api)     deploy_mobile_api ;;
        admin-api)      deploy_admin_api ;;
        observability)  deploy_observability ;;
        nginx)          deploy_nginx ;;
        *)
            log_error "Unknown service: ${target}"
            exit 1
            ;;
    esac
}

deploy_all_services() {
    local skipped=0
    local deployed=0

    log_section "Full stack deploy"
    log_info "Services without .env are skipped (not failed)"

    if compose_file_present "${NGINX_DIR}"; then
        deploy_nginx || log_warn "nginx deploy had issues"
        deployed=$((deployed + 1))
    else
        log_warn "Skipped nginx — no compose file"
        skipped=$((skipped + 1))
    fi

    for entry in \
        "${MOBILE_API_DIR}:novasafe-mobile-vault:true" \
        "${ADMIN_API_DIR}:novasafe-admin-api:true" \
        "${OBSERVABILITY_DIR}:novasafe-alloy:true" \
        "${AUTH_DIR}:novasafe-auth:true" \
        "${APP_DIR}:novasafe-app:true" \
        "${LANDING_DIR}:novasafe-landing:false" \
        "${MOBILE_LANDING_DIR}:mobile-landing:false"; do

        IFS=':' read -r dir container needs_env <<< "${entry}"

        if ! compose_file_present "${dir}"; then
            log_warn "Skipped ${container} — no compose file in ${dir}"
            skipped=$((skipped + 1))
            continue
        fi

        if [ "${needs_env}" = "true" ] && ! env_file_present "${dir}"; then
            log_warn "Skipped ${container} — no .env in ${dir}"
            skipped=$((skipped + 1))
            continue
        fi

        if [ "${container}" = "novasafe-mobile-vault" ]; then
            deploy_mobile_api && deployed=$((deployed + 1)) || log_warn "${container} deploy had issues"
        elif [ "${container}" = "novasafe-admin-api" ]; then
            deploy_admin_api && deployed=$((deployed + 1)) || log_warn "${container} deploy had issues"
        else
            deploy_compose_dir "${dir}" "${container}" "${needs_env}" "skip" && deployed=$((deployed + 1)) || true
        fi
    done

    reload_nginx_if_running

    log_summary_row "Deployed/updated" "${deployed}"
    log_summary_row "Skipped" "${skipped}"
}

case "${SERVICE}" in

ensure-ready)
    ensure_ready
    ;;

sync)
    log_banner "NovaSafe Sync" "Pull latest deployment config"
    sync_config
    ;;

landing|mobile-landing|auth|app|mobile-api|admin-api|observability|nginx)
    if [ "${NOVASAFE_SKIP_SYNC:-}" != "true" ]; then
        sync_config
    fi
    run_service_deploy "${SERVICE}"
    ;;

nginx-reload)
    nginx_reload
    ;;

all)
    log_banner "NovaSafe Full Deploy" "All services"
    ensure_ready
    sync_config
    deploy_all_services
    log_ok "Full deploy finished"
    ;;

status)
    log_banner "Container Status" ""
    docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'
    ;;

logs)
    TARGET="${2:-}"
    if [ -z "${TARGET}" ]; then
        echo "Usage: ./deploy.sh logs <container>"
        exit 1
    fi
    docker logs -f "${TARGET}"
    ;;

restart)
    TARGET="${2:-}"
    if [ -z "${TARGET}" ]; then
        echo "Usage: ./deploy.sh restart <container>"
        exit 1
    fi
    if ! docker ps -a --format '{{.Names}}' | grep -Fxq "${TARGET}"; then
        log_error "Container not found: ${TARGET}"
        exit 1
    fi
    docker restart "${TARGET}"
    log_ok "Restarted ${TARGET}"
    ;;

cleanup)
    log_step "Pruning unused Docker images and containers"
    docker image prune -f
    docker container prune -f
    log_ok "Cleanup done"
    ;;

*)
    echo "Usage:"
    echo ""
    echo "  ./deploy.sh ensure-ready     Run initial-setup + first-boot if needed"
    echo "  ./deploy.sh sync             Pull repo + sync config"
    echo "  ./deploy.sh landing | auth | app | mobile-api | admin-api | observability | nginx | ..."
    echo "  ./deploy.sh all              Full stack (skips services without .env)"
    echo "  ./deploy.sh status | logs | restart | cleanup"
    echo ""
    exit 1
    ;;

esac

log_divider
log_ok "Finished: ${SERVICE:-done}"
