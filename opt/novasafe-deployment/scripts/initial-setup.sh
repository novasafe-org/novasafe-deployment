#!/bin/bash
#
# One-time VPS bootstrap for a fresh Hostinger (or any) server.
# Safe to re-run — skips steps that are already done.
#
# Env:
#   NOVASAFE_DEPLOY_PATH  (default: /opt/novasafe-deployment)
#   NOVASAFE_DEPLOY_REPO  (default: /opt/novasafe-deployment-repo)
#   NOVASAFE_DEPLOY_REPO_URL (default: novasafe-org repo on GitHub)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/logging.sh
source "${SCRIPT_DIR}/lib/logging.sh"

REPO_ROOT="${NOVASAFE_DEPLOY_REPO:-/opt/novasafe-deployment-repo}"
BASE_DIR="${NOVASAFE_DEPLOY_PATH:-/opt/novasafe-deployment}"
REPO_URL="${NOVASAFE_DEPLOY_REPO_URL:-https://github.com/novasafe-org/novasafe-deployment.git}"
MARKER_FILE="${BASE_DIR}/.novasafe-initial-setup-done"

log_banner "NovaSafe Initial Setup" "Preparing a fresh VPS for automated deploys"

log_summary_row "Deploy path" "$BASE_DIR"
log_summary_row "Git clone path" "$REPO_ROOT"
log_summary_row "Repository" "$REPO_URL"
log_divider

# ── 1. System packages ──────────────────────────────────────────────────────
log_section "System packages"

if command -v apt-get >/dev/null 2>&1; then
    log_step "Updating apt and installing dependencies"
    log_cmd "apt-get update && apt-get install -y docker.io docker-compose-plugin git rsync curl ca-certificates"
    export DEBIAN_FRONTEND=noninteractive
    apt-get update -qq
    apt-get install -y -qq docker.io docker-compose-plugin git rsync curl ca-certificates
    log_ok "Packages installed"
else
    log_warn "apt-get not found — assuming Docker, git, and rsync are already installed"
fi

# ── 2. Docker daemon ────────────────────────────────────────────────────────
log_section "Docker"

if command -v docker >/dev/null 2>&1; then
    log_ok "Docker CLI available: $(docker --version 2>/dev/null || echo 'unknown')"
else
    log_error "Docker is not available after install"
    exit 1
fi

if systemctl is-active docker >/dev/null 2>&1; then
    log_ok "Docker daemon is running"
else
    log_step "Starting Docker daemon"
    systemctl enable docker 2>/dev/null || true
    systemctl start docker 2>/dev/null || service docker start 2>/dev/null || true
    log_ok "Docker daemon started"
fi

# ── 3. Docker network ───────────────────────────────────────────────────────
log_section "Docker network"

if docker network inspect novasafe-network >/dev/null 2>&1; then
    log_ok "Network 'novasafe-network' already exists"
else
    log_step "Creating shared network novasafe-network"
    docker network create novasafe-network
    log_ok "Network created"
fi

# ── 4. Clone deployment repo ────────────────────────────────────────────────
log_section "Deployment repository"

if [ -d "${REPO_ROOT}/.git" ]; then
    log_ok "Git repo already cloned at ${REPO_ROOT}"
    log_step "Pulling latest changes"
    cd "${REPO_ROOT}"
    git fetch origin -q
    git pull origin master 2>/dev/null || git pull origin main 2>/dev/null || true
    log_ok "Repository up to date"
else
    log_step "Cloning novasafe-deployment"
    mkdir -p "$(dirname "${REPO_ROOT}")"
    log_cmd "git clone ${REPO_URL} ${REPO_ROOT}"
    git clone "${REPO_URL}" "${REPO_ROOT}"
    log_ok "Repository cloned"
fi

# ── 5. Sync live config ───────────────────────────────────────────────────────
log_section "Sync config to live path"

mkdir -p "${BASE_DIR}"
log_step "Rsync opt/novasafe-deployment → ${BASE_DIR}"
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
chmod +x "${BASE_DIR}/scripts/lib/"*.sh 2>/dev/null || true

log_ok "Config synced"

# ── 6. Verify layout ──────────────────────────────────────────────────────────
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

mkdir -p "${BASE_DIR}/mobile-api/logs"
touch "${MARKER_FILE}"
date -u '+%Y-%m-%d %H:%M:%S UTC' > "${MARKER_FILE}"

log_section "Initial setup complete"
log_ok "Server is ready for deploy.sh and first-boot"
log_info "Next: copy .env files to platform/app, platform/auth, platform/backend, mobile-api"
log_info "Next: ensure Cloudflare origin certs are in infra/nginx/cloudflare/"
log_divider
