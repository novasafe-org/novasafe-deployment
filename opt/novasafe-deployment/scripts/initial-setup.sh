#!/bin/bash
#
# One-time VPS bootstrap — safe to re-run; skips anything already present.
#
# Env:
#   NOVASAFE_DEPLOY_PATH  (default: /opt/novasafe-deployment)
#   NOVASAFE_DEPLOY_REPO  (default: /opt/novasafe-deployment-repo)
#   NOVASAFE_DEPLOY_REPO_URL

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/logging.sh
source "${SCRIPT_DIR}/lib/logging.sh"
# shellcheck source=lib/common.sh
source "${SCRIPT_DIR}/lib/common.sh"

REPO_ROOT="${NOVASAFE_DEPLOY_REPO:-/opt/novasafe-deployment-repo}"
BASE_DIR="${NOVASAFE_DEPLOY_PATH:-/opt/novasafe-deployment}"
REPO_URL="${NOVASAFE_DEPLOY_REPO_URL:-https://github.com/novasafe-org/novasafe-deployment.git}"
MARKER_FILE="${BASE_DIR}/.novasafe-initial-setup-done"

log_banner "NovaSafe Initial Setup" "Preparing VPS for automated deploys"
log_summary_row "Deploy path" "$BASE_DIR"
log_summary_row "Git clone path" "$REPO_ROOT"
log_summary_row "Repository" "$REPO_URL"
log_divider

# ── Fast path: already fully set up ─────────────────────────────────────────
if [ -f "${MARKER_FILE}" ] \
    && [ -f "${BASE_DIR}/deploy.sh" ] \
    && [ -f "${BASE_DIR}/platform/app/docker-compose.yml" ] \
    && command_exists docker \
    && docker network inspect novasafe-network >/dev/null 2>&1; then
    log_ok "Initial setup already complete ($(cat "${MARKER_FILE}"))"
    log_info "Re-syncing config only..."
    # fall through to git pull + rsync (non-destructive)
fi

# ── 1. System packages (never fail script on apt conflicts) ───────────────────
log_section "System packages"

if command_exists apt-get; then
    export DEBIAN_FRONTEND=noninteractive
    log_step "Updating apt package lists"
    apt-get update -qq || log_warn "apt-get update failed — continuing with cached indexes"

    for pkg in git rsync curl ca-certificates; do
        if command_exists "${pkg}"; then
            log_ok "Already available: ${pkg}"
        else
            apt_install_if_missing "${pkg}" || true
        fi
    done

    if command_exists docker; then
        log_ok "Docker already present — skipping docker package install"
        docker --version 2>/dev/null || true
    else
        log_step "Docker not found — attempting install"
        apt-get install -y -qq docker.io 2>/dev/null \
            || apt-get install -y -qq docker-ce docker-ce-cli containerd.io 2>/dev/null \
            || log_warn "Docker package install failed — install Docker manually if needed"
    fi

    if docker compose version >/dev/null 2>&1 || command_exists docker-compose; then
        log_ok "Compose CLI already available"
    else
        log_step "Installing compose plugin"
        apt-get install -y -qq docker-compose-plugin 2>/dev/null \
            || apt-get install -y -qq docker-compose 2>/dev/null \
            || log_warn "Compose install skipped — may already exist under another name"
    fi
else
    log_warn "apt-get not found — assuming packages are pre-installed (Hostinger template)"
fi

# ── 2. Docker CLI + daemon ────────────────────────────────────────────────────
log_section "Docker runtime"

ensure_docker_cli || exit 1
ensure_compose_cli || exit 1
ensure_docker_daemon || true

# ── 3. Docker network ───────────────────────────────────────────────────────
log_section "Docker network"
ensure_docker_network novasafe-network

# ── 4. Deployment git repo ──────────────────────────────────────────────────
log_section "Deployment repository"

ensure_directory "$(dirname "${REPO_ROOT}")"

if [ -d "${REPO_ROOT}/.git" ]; then
    log_ok "Git repo exists at ${REPO_ROOT}"
    log_step "Pulling latest"
    cd "${REPO_ROOT}"
    git fetch origin -q 2>/dev/null || log_warn "git fetch failed — using local copy"
    git pull origin master 2>/dev/null || git pull origin main 2>/dev/null || log_warn "git pull failed — using local copy"
elif [ -d "${REPO_ROOT}" ]; then
    log_warn "${REPO_ROOT} exists but is not a git repo — renaming and re-cloning"
    mv "${REPO_ROOT}" "${REPO_ROOT}.bak.$(date +%s)" 2>/dev/null || true
    git clone "${REPO_URL}" "${REPO_ROOT}" || { log_error "git clone failed"; exit 1; }
else
    log_step "Cloning novasafe-deployment"
    git clone "${REPO_URL}" "${REPO_ROOT}" || { log_error "git clone failed"; exit 1; }
    log_ok "Repository cloned"
fi

if [ ! -d "${REPO_ROOT}/opt/novasafe-deployment" ]; then
    log_error "Expected path missing: ${REPO_ROOT}/opt/novasafe-deployment"
    exit 1
fi

# ── 5. Sync live config (never overwrites .env) ─────────────────────────────
log_section "Sync config to live path"

ensure_directory "${BASE_DIR}"
log_step "Rsync → ${BASE_DIR}"
rsync -a \
    --exclude '.env' \
    --exclude '.env.*' \
    --exclude '**/.env' \
    --exclude '**/.env.*' \
    --exclude 'logs/' \
    --exclude '**/logs/' \
    --exclude 'infra/nginx/conf.d/internal-docker.allowed_ips.conf' \
    --exclude '.novasafe-initial-setup-done' \
    --exclude '.novasafe-first-boot-done' \
    "${REPO_ROOT}/opt/novasafe-deployment/" "${BASE_DIR}/"

ensure_file_executable "${BASE_DIR}/deploy.sh"
for f in "${BASE_DIR}/scripts/"*.sh "${BASE_DIR}/scripts/lib/"*.sh; do
    ensure_file_executable "$f"
done

log_ok "Config synced"

# ── 6. Required directories ─────────────────────────────────────────────────
ensure_directory "${BASE_DIR}/mobile-api/logs"
ensure_directory "${BASE_DIR}/infra/nginx/cloudflare"

ALLOWED_IPS="${BASE_DIR}/infra/nginx/conf.d/internal-docker.allowed_ips.conf"
ALLOWED_IPS_EXAMPLE="${BASE_DIR}/infra/nginx/conf.d/internal-docker.allowed_ips.conf.example"
if [ ! -f "${ALLOWED_IPS}" ] && [ -f "${ALLOWED_IPS_EXAMPLE}" ]; then
    cp "${ALLOWED_IPS_EXAMPLE}" "${ALLOWED_IPS}"
    log_ok "Created Portainer IP allowlist from example (edit before use)"
fi

# ── 7. Verify layout ────────────────────────────────────────────────────────
log_section "Verification"

REQUIRED_PATHS=(
    "${BASE_DIR}/deploy.sh"
    "${BASE_DIR}/infra/nginx/docker-compose.yml"
    "${BASE_DIR}/platform/app/docker-compose.yml"
    "${BASE_DIR}/marketing/landing/docker-compose.yml"
)

ALL_OK=true
for path in "${REQUIRED_PATHS[@]}"; do
    if [ -f "$path" ]; then
        log_ok "Found $(basename "$(dirname "$path")")/$(basename "$path")"
    else
        log_error "Missing $path"
        ALL_OK=false
    fi
done

if [ "$ALL_OK" = false ]; then
    log_error "Initial setup verification failed"
    exit 1
fi

date -u '+%Y-%m-%d %H:%M:%S UTC' > "${MARKER_FILE}"

log_section "Initial setup complete"
log_ok "Server ready for deploy.sh"
log_info "Copy .env files to platform/app, platform/auth, mobile-api when ready"
log_info "Place Cloudflare origin certs in infra/nginx/cloudflare/ if not already there"
log_divider
