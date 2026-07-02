#!/bin/bash
#
# Fetch latest novasafe-deployment from GitHub and rsync to the live deploy path.
# Used by deploy.sh sync, initial-setup, and GitHub Actions before every deploy.
#
# Env:
#   NOVASAFE_DEPLOY_REPO       (default: /opt/novasafe-deployment-repo)
#   NOVASAFE_DEPLOY_PATH       (default: /opt/novasafe-deployment)
#   NOVASAFE_DEPLOY_REPO_URL   (default: https://github.com/novasafe-org/novasafe-deployment.git)
#   NOVASAFE_DEPLOY_BRANCH     (default: master)
#   NOVASAFE_EXPECTED_SHA      (optional — fail if HEAD does not match after sync)
#   NOVASAFE_STRICT_SHA        (default: false — set true in CI to enforce EXPECTED_SHA)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/logging.sh
source "${SCRIPT_DIR}/lib/logging.sh"
# shellcheck source=lib/common.sh
source "${SCRIPT_DIR}/lib/common.sh"

REPO_ROOT="${NOVASAFE_DEPLOY_REPO:-/opt/novasafe-deployment-repo}"
BASE_DIR="${NOVASAFE_DEPLOY_PATH:-/opt/novasafe-deployment}"
REPO_URL="${NOVASAFE_DEPLOY_REPO_URL:-https://github.com/novasafe-org/novasafe-deployment.git}"
BRANCH="${NOVASAFE_DEPLOY_BRANCH:-master}"
EXPECTED_SHA="${NOVASAFE_EXPECTED_SHA:-}"
STRICT_SHA="${NOVASAFE_STRICT_SHA:-false}"

log_banner "Sync deployment repository" "Git → live path on VPS"
log_summary_row "Git clone path" "${REPO_ROOT}"
log_summary_row "Live deploy path" "${BASE_DIR}"
log_summary_row "Remote URL" "${REPO_URL}"
log_summary_row "Branch" "${BRANCH}"
if [ -n "${EXPECTED_SHA}" ]; then
    log_summary_row "Expected SHA" "${EXPECTED_SHA}"
fi
log_divider

ensure_directory "$(dirname "${REPO_ROOT}")"

if [ ! -d "${REPO_ROOT}/.git" ]; then
    log_step "Cloning deployment repository"
    if [ -d "${REPO_ROOT}" ]; then
        log_warn "${REPO_ROOT} exists but is not a git repo — removing"
        rm -rf "${REPO_ROOT}"
    fi
    git clone --branch "${BRANCH}" "${REPO_URL}" "${REPO_ROOT}"
    log_ok "Repository cloned"
else
  log_ok "Git repository found at ${REPO_ROOT}"
fi

cd "${REPO_ROOT}"
git remote set-url origin "${REPO_URL}" 2>/dev/null || true

BEFORE=$(git rev-parse --short HEAD 2>/dev/null || echo unknown)
log_step "Fetching origin/${BRANCH}"
if ! git fetch origin "${BRANCH}" --prune; then
    log_error "git fetch failed for ${REPO_URL} (branch: ${BRANCH})"
    log_info "Check VPS outbound HTTPS and that the repo URL is reachable."
    exit 1
fi

if ! git show-ref --verify --quiet "refs/remotes/origin/${BRANCH}"; then
    log_error "Remote branch origin/${BRANCH} not found after fetch"
    exit 1
fi

log_step "Checking out origin/${BRANCH}"
git checkout -B "${BRANCH}" "origin/${BRANCH}"
git reset --hard "origin/${BRANCH}"

AFTER=$(git rev-parse HEAD)
AFTER_SHORT=$(git rev-parse --short HEAD)
log_info "Deployment repo: ${BEFORE} → ${AFTER_SHORT} (${AFTER})"

if [ -n "${EXPECTED_SHA}" ] && [ "${AFTER}" != "${EXPECTED_SHA}" ]; then
    if [ "${STRICT_SHA}" = "true" ]; then
        log_error "HEAD ${AFTER_SHORT} does not match pipeline commit ${EXPECTED_SHA}"
        exit 1
    fi
    log_warn "HEAD ${AFTER_SHORT} != pipeline commit ${EXPECTED_SHA} (continuing)"
fi

SOURCE="${REPO_ROOT}/opt/novasafe-deployment"
if [ ! -d "${SOURCE}" ]; then
    log_error "Expected path missing in repo: ${SOURCE}"
    exit 1
fi

log_step "Rsync → ${BASE_DIR}"
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
    "${SOURCE}/" "${BASE_DIR}/"

ensure_file_executable "${BASE_DIR}/deploy.sh"
for f in "${BASE_DIR}/scripts/"*.sh "${BASE_DIR}/scripts/lib/"*.sh; do
    ensure_file_executable "$f"
done
for f in "${BASE_DIR}/infra/observability/scripts/"*.sh; do
    [ -f "$f" ] && ensure_file_executable "$f"
done

if [ -f "${SOURCE}/infra/observability/docker-compose.yml" ] \
    && [ ! -f "${BASE_DIR}/infra/observability/docker-compose.yml" ]; then
    log_error "rsync did not copy infra/observability — sync incomplete"
    exit 1
fi

log_ok "Live config synced to ${BASE_DIR} @ ${AFTER_SHORT}"
log_divider
