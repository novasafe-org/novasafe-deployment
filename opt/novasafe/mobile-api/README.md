# NovaSafe Mobile Vault API

**Production URL:** [https://mobile-api.novasafe.io](https://mobile-api.novasafe.io)

Deploy on server: `/opt/novasafe/mobile-api/`

## CI (GitHub Actions)

`novasafe-backend/.github/workflows/mobile-vault-service.yml` on push to `main`:

1. Builds `ghcr.io/novasafe-org/novasafe-mobile-vault:latest`
2. SCPs `services/mobile_vault/deploy/docker-compose.yml` → `/opt/novasafe/mobile-api/docker-compose.yml` (does **not** overwrite `.env`)
3. Runs `docker compose pull` + `docker compose up -d` for service `mobile_vault`
4. Waits for healthy container and probes `http://127.0.0.1:8085/mobile/health`

Optional GitHub secrets: `MOBILE_VAULT_DEPLOY_DIR`, `MOBILE_VAULT_CONTAINER_NAME` (default `novasafe-mobile-vault`).

## Nginx (fix 502)

502 usually means **`conf.d/mobile-api.conf` is missing or still points at `mobile-vault-backend`**. Without it, nginx sends `mobile-api.novasafe.io` to the wrong default vhost (`api.conf` → `backend:3123`).

**Quick fix on server:**

```bash
bash /opt/novasafe/scripts/fix-mobile-api-502.sh
```

Or manually copy `opt/novasafe/infra/nginx/conf.d/mobile-api.conf` to the server, then:

```bash
docker network connect novasafe-network novasafe-nginx 2>/dev/null || true
docker network connect novasafe-network novasafe-mobile-vault 2>/dev/null || true
cd /opt/novasafe/infra/nginx
docker compose exec nginx nginx -t && docker compose exec nginx nginx -s reload
docker exec novasafe-nginx wget -qO- http://novasafe-mobile-vault:3124/mobile/health
```

See [MOBILE_API_DOMAIN.md](../../MOBILE_API_DOMAIN.md) for DNS and migration.

```bash
curl -sS https://mobile-api.novasafe.io/mobile/health
curl -sS http://127.0.0.1:8085/mobile/health
```

App env:

```env
VITE_MOBILE_VAULT_API_URL=https://mobile-api.novasafe.io
```
