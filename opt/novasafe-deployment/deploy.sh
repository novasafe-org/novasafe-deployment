#!/bin/bash
#
# NovaSafe VPS deployment helper.
# Run on the server at /opt/novasafe-deployment/deploy.sh
#
# On a fresh server, any deploy automatically runs initial-setup + first-boot.
#
# Environment (optional — sensible defaults for Hostinger layout):
#   NOVASAFE_DEPLOY_PATH  → /opt/novasafe-deployment   (live config + compose)
#   NOVASAFE_DEPLOY_REPO  → /opt/novasafe-deployment-repo (git clone of this repo)
#   GHCR_TOKEN / GHCR_USER → docker login before pull (set by CI)

set -euo pipefail

REPO_ROOT="${NOVASAFE_DEPLOY_REPO:-/opt/novasafe-deployment-repo}"
BASE_DIR="${NOVASAFE_DEPLOY_PATH:-/opt/novasafe-deployment}"
SCRIPTS_DIR="${BASE_DIR}/scripts"

LANDING_DIR="$BASE_DIR/marketing/landing"
MOBILE_LANDING_DIR="$BASE_DIR/marketing/mobile-landing"
AUTH_DIR="$BASE_DIR/platform/auth"
APP_DIR="$BASE_DIR/platform/app"
BACKEND_DIR="$BASE_DIR/platform/backend"
MOBILE_API_DIR="$BASE_DIR/mobile-api"
NGINX_DIR="$BASE_DIR/infra/nginx"
PORTAINER_DIR="$BASE_DIR/infra/portainer"

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

is_server_ready() {
    [ -f "${BASE_DIR}/deploy.sh" ] \
        && [ -f "${BASE_DIR}/platform/app/docker-compose.yml" ] \
        && [ -f "${BASE_DIR}/.novasafe-initial-setup-done" ] \
        && command -v docker >/dev/null 2>&1 \
        && docker network inspect novasafe-network >/dev/null 2>&1
}

ensure_ready() {
    log_banner "NovaSafe Pre-flight" "Checking server readiness"

    if ! is_server_ready; then
        log_section "Initial setup required"
        log_warn "Fresh or incomplete server detected — running initial-setup.sh"

        if [ -f "${SCRIPTS_DIR}/initial-setup.sh" ]; then
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
    else
        DC="docker-compose"
    fi
}

ghcr_login() {
    if [ -n "${GHCR_TOKEN:-}" ] && [ -n "${GHCR_USER:-}" ]; then
        log_step "Logging into GHCR as ${GHCR_USER}"
        echo "${GHCR_TOKEN}" | docker login ghcr.io -u "${GHCR_USER}" --password-stdin
        log_ok "GHCR login successful"
    fi
}

sync_config() {
    log_section "Sync deployment config"

    if [ ! -d "$REPO_ROOT/.git" ]; then
        log_error "Git repo not found at $REPO_ROOT"
        log_info "Run: ./deploy.sh ensure-ready  (or initial-setup.sh on a fresh server)"
        exit 1
    fi

    log_step "Pulling latest from Git"
    cd "$REPO_ROOT"
    git fetch origin -q
    git pull origin master 2>/dev/null || git pull origin main

    mkdir -p "$BASE_DIR"
    rsync -a \
        --exclude '.env' \
        --exclude '.env.*' \
        --exclude '**/.env' \
        --exclude '**/.env.*' \
        --exclude 'logs/' \
        --exclude '**/logs/' \
        "${REPO_ROOT}/opt/novasafe-deployment/" "${BASE_DIR}/"

    chmod +x "${BASE_DIR}/deploy.sh" 2>/dev/null || true
    chmod +x "${BASE_DIR}/scripts/"*.sh 2>/dev/null || true

    log_ok "Config synced to ${BASE_DIR}"
}

require_env_file() {
    local dir="$1"
    if [ ! -f "${dir}/.env" ]; then
        log_error ".env missing in ${dir}"
        log_info "Copy production .env to the server (see README Step 3), then redeploy."
        exit 1
    fi
}

deploy_compose_dir() {
    local dir="$1"
    local container="$2"
    local needs_env="${3:-false}"

    log_section "Deploy ${container}"
    log_info "Directory: ${dir}"

    if [ ! -d "$dir" ]; then
        log_error "Directory not found: $dir"
        exit 1
    fi

    if [ "$needs_env" = "true" ]; then
        require_env_file "$dir"
    fi

    cd "$dir"
    detect_compose
    ghcr_login

    log_step "Pulling latest image"
    $DC pull

    log_step "Recreating container"
    $DC up -d --remove-orphans

    log_step "Container status"
    docker ps --filter "name=${container}" --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}' || true

    log_step "Recent logs (last 30 lines)"
    docker logs --tail 30 "$container" 2>/dev/null || true

    log_ok "${container} deployed"
}

deploy_nginx() {
    deploy_compose_dir "$NGINX_DIR" "novasafe-nginx" false
    log_step "Validating and reloading nginx"
    docker exec novasafe-nginx nginx -t
    docker exec novasafe-nginx nginx -s reload
    log_ok "Nginx reloaded"
}

deploy_mobile_api() {
    deploy_compose_dir "$MOBILE_API_DIR" "novasafe-mobile-vault" true

    docker network create novasafe-network 2>/dev/null || true
    docker network connect novasafe-network novasafe-nginx 2>/dev/null || true
    docker network connect novasafe-network novasafe-mobile-vault 2>/dev/null || true

    log_step "Waiting for health (up to 90s)"
    for i in $(seq 1 18); do
        STATUS=$(docker inspect --format='{{.State.Health.Status}}' novasafe-mobile-vault 2>/dev/null || echo "unknown")
        log_info "Health check ${i}/18 — status: ${STATUS}"
        if [ "$STATUS" = "healthy" ]; then
            log_ok "Container is healthy"
            break
        fi
        if [ "$i" -eq 18 ]; then
            log_error "Health check did not pass (status=${STATUS})"
            docker logs --tail 80 novasafe-mobile-vault || true
            exit 1
        fi
        sleep 5
    done

    if docker ps --format '{{.Names}}' | grep -Fxq novasafe-nginx; then
        docker exec novasafe-nginx nginx -t
        docker exec novasafe-nginx nginx -s reload
        log_ok "Nginx reloaded after mobile-api deploy"
    fi
}

nginx_reload() {
    if ! docker ps --format '{{.Names}}' | grep -Fxq novasafe-nginx; then
        log_error "novasafe-nginx is not running"
        exit 1
    fi
    docker exec novasafe-nginx nginx -t
    docker exec novasafe-nginx nginx -s reload
    log_ok "Nginx reloaded"
}

run_service_deploy() {
    local target="$1"

    log_banner "NovaSafe Deploy" "Service: ${target}"
    log_summary_row "Deploy path" "$BASE_DIR"
    log_summary_row "Triggered service" "$target"

    if [ "${NOVASAFE_IN_FIRST_BOOT:-}" != "true" ]; then
        ensure_ready
    fi

    case "$target" in
        landing)        deploy_compose_dir "$LANDING_DIR" "novasafe-landing" false ;;
        mobile-landing) deploy_compose_dir "$MOBILE_LANDING_DIR" "mobile-landing" false ;;
        auth)           deploy_compose_dir "$AUTH_DIR" "novasafe-auth" true ;;
        app)            deploy_compose_dir "$APP_DIR" "novasafe-app" true ;;
        backend)        deploy_compose_dir "$BACKEND_DIR" "novasafe-backend" true ;;
        mobile-api)     deploy_mobile_api ;;
        nginx)          deploy_nginx ;;
        portainer)      deploy_compose_dir "$PORTAINER_DIR" "portainer" false ;;
        *)
            log_error "Unknown service: ${target}"
            exit 1
            ;;
    esac
}

case "$SERVICE" in

ensure-ready)
    ensure_ready
    ;;

sync)
    log_banner "NovaSafe Sync" "Pull latest deployment config"
    sync_config
    ;;

landing|mobile-landing|auth|app|backend|mobile-api|nginx|portainer)
    if [ "${NOVASAFE_SKIP_SYNC:-}" != "true" ]; then
        sync_config
    fi
    run_service_deploy "$SERVICE"
    ;;

nginx-reload)
    nginx_reload
    ;;

all)
    log_banner "NovaSafe Full Deploy" "All services"
    ensure_ready
    sync_config
    deploy_compose_dir "$NGINX_DIR" "novasafe-nginx" false
    deploy_compose_dir "$BACKEND_DIR" "novasafe-backend" true
    deploy_compose_dir "$MOBILE_API_DIR" "novasafe-mobile-vault" true
    deploy_compose_dir "$AUTH_DIR" "novasafe-auth" true
    deploy_compose_dir "$APP_DIR" "novasafe-app" true
    deploy_compose_dir "$LANDING_DIR" "novasafe-landing" false
    deploy_compose_dir "$MOBILE_LANDING_DIR" "mobile-landing" false
    deploy_compose_dir "$PORTAINER_DIR" "portainer" false
    nginx_reload
    log_ok "All services deployed"
    ;;

status)
    log_banner "Container Status" ""
    docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'
    ;;

logs)
    TARGET="${2:-}"
    if [ -z "$TARGET" ]; then
        echo "Usage: ./deploy.sh logs <container>"
        exit 1
    fi
    docker logs -f "$TARGET"
    ;;

restart)
    TARGET="${2:-}"
    if [ -z "$TARGET" ]; then
        echo "Usage: ./deploy.sh restart <container>"
        exit 1
    fi
    docker restart "$TARGET"
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
    echo "  ./deploy.sh landing | auth | app | backend | mobile-api | nginx | ..."
    echo "  ./deploy.sh all              Full stack"
    echo "  ./deploy.sh status | logs | restart | cleanup"
    echo ""
    exit 1
    ;;

esac

log_divider
log_ok "Finished: ${SERVICE:-done}"
