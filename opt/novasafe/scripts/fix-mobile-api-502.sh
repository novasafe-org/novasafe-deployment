#!/bin/bash
# Run on novasafe-s1 as root to fix https://mobile-api.novasafe.io 502 Bad Gateway.
set -euo pipefail

MOBILE_API_DIR="${MOBILE_API_DIR:-/opt/novasafe/mobile-api}"
NGINX_DIR="${NGINX_DIR:-/opt/novasafe/infra/nginx}"
CONTAINER="${CONTAINER:-novasafe-mobile-vault}"
NETWORK="${NETWORK:-novasafe-network}"

echo "==> Ensure Docker network: ${NETWORK}"
docker network create "${NETWORK}" 2>/dev/null || true

echo "==> Connect nginx + mobile vault to ${NETWORK}"
docker network connect "${NETWORK}" novasafe-nginx 2>/dev/null || true
docker network connect "${NETWORK}" "${CONTAINER}" 2>/dev/null || true

echo "==> Start / recreate mobile vault"
cd "${MOBILE_API_DIR}"
if docker compose version >/dev/null 2>&1; then
  DC="docker compose"
else
  DC="docker-compose"
fi
$DC up -d --force-recreate mobile_vault

echo "==> Wait for healthy container"
for i in $(seq 1 18); do
  STATUS=$(docker inspect --format='{{.State.Health.Status}}' "${CONTAINER}" 2>/dev/null || echo "unknown")
  if [ "${STATUS}" = "healthy" ]; then
    echo "Container healthy"
    break
  fi
  [ "$i" -eq 18 ] && { docker logs --tail 50 "${CONTAINER}"; exit 1; }
  sleep 5
done

echo "==> Direct health (host port 8085)"
curl -fsS "http://127.0.0.1:8085/mobile/health"
echo ""

CONF="${NGINX_DIR}/conf.d/mobile-api.conf"
if [ ! -f "${CONF}" ]; then
  echo "ERROR: Missing ${CONF}"
  echo "Copy from repo: novasafe-deployment/opt/novasafe/infra/nginx/conf.d/mobile-api.conf"
  exit 1
fi

if ! grep -q 'novasafe-mobile-vault' "${CONF}"; then
  echo "ERROR: ${CONF} must proxy to novasafe-mobile-vault (not mobile-vault-backend)"
  exit 1
fi

echo "==> Test nginx -> container DNS"
docker exec novasafe-nginx wget -qO- "http://novasafe-mobile-vault:3124/mobile/health"
echo ""

echo "==> Reload nginx"
cd "${NGINX_DIR}"
docker compose exec -T nginx nginx -t
docker compose exec -T nginx nginx -s reload

echo "==> HTTPS probe (origin, via Host header)"
curl -fsSk "https://127.0.0.1/mobile/health" -H "Host: mobile-api.novasafe.io"
echo ""
echo "Done. Verify in browser: https://mobile-api.novasafe.io/mobile/health"
