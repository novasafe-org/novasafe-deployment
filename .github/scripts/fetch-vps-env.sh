#!/usr/bin/env bash
# Fetch a production .env file from the NovaSafe VPS (same file Docker uses on the server).
#
# Usage:
#   fetch-vps-env.sh <remote-relative-path> <local-output>
#
# Example:
#   fetch-vps-env.sh mobile-api/.env /tmp/service.env
#
# Required environment variables:
#   SSH_USER, SSH_HOST, DEPLOY_PATH
#   SSH_PASSWORD and/or SSH_PRIVATE_KEY
set -euo pipefail

REMOTE_REL="${1:?remote relative path required (e.g. mobile-api/.env)}"
LOCAL_OUT="${2:?local output path required}"

trim() { printf '%s' "$1" | tr -d '[:space:]'; }

SSH_USER="$(trim "${SSH_USER:-}")"
SSH_HOST="$(trim "${SSH_HOST:-}")"
DEPLOY_PATH="$(trim "${DEPLOY_PATH:-}")"
SSH_PASSWORD="${SSH_PASSWORD:-}"
SSH_PRIVATE_KEY="${SSH_PRIVATE_KEY:-}"

if [ -z "${SSH_USER}" ] || [ -z "${SSH_HOST}" ] || [ -z "${DEPLOY_PATH}" ]; then
  echo "::error::SSH_USER, SSH_HOST, and DEPLOY_PATH are required to fetch .env from VPS."
  exit 1
fi

SSH_HOST="${SSH_HOST#*@}"
SSH_HOST="${SSH_HOST#*://}"
SSH_HOST="${SSH_HOST%%/*}"

REMOTE_PATH="${DEPLOY_PATH%/}/${REMOTE_REL}"
USE_SSH_KEY=false
if printf '%s' "${SSH_PRIVATE_KEY}" | grep -q 'BEGIN.*PRIVATE KEY'; then
  USE_SSH_KEY=true
fi

if [ "${USE_SSH_KEY}" = false ] && [ -z "${SSH_PASSWORD}" ]; then
  echo "::error::Set SSH_PASSWORD or SSH_PRIVATE_KEY to fetch .env from VPS."
  exit 1
fi

mkdir -p ~/.ssh
chmod 700 ~/.ssh

if [ "${USE_SSH_KEY}" = true ]; then
  printf '%s\n' "${SSH_PRIVATE_KEY}" > ~/.ssh/deploy_key
  chmod 600 ~/.ssh/deploy_key
  scp -i ~/.ssh/deploy_key \
    -o StrictHostKeyChecking=no \
    -o UserKnownHostsFile=/dev/null \
    "${SSH_USER}@${SSH_HOST}:${REMOTE_PATH}" "${LOCAL_OUT}"
else
  sudo apt-get update -qq
  sudo apt-get install -y -qq sshpass
  sshpass -p "${SSH_PASSWORD}" scp \
    -o StrictHostKeyChecking=no \
    -o UserKnownHostsFile=/dev/null \
    "${SSH_USER}@${SSH_HOST}:${REMOTE_PATH}" "${LOCAL_OUT}"
fi

if [ ! -s "${LOCAL_OUT}" ]; then
  echo "::error::Fetched .env is empty: ${REMOTE_PATH}"
  exit 1
fi

echo "[vps-env] fetched ${REMOTE_PATH} → ${LOCAL_OUT} ($(wc -l < "${LOCAL_OUT}") lines)"
