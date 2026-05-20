# Mobile API domain (`mobile-api.novasafe.io`)

Single production API host for the NovaSafe mobile vault backend.

## URL

```text
https://mobile-api.novasafe.io
```

Examples:

- Health: `https://mobile-api.novasafe.io/mobile/health`
- Auth: `https://mobile-api.novasafe.io/mobile/auth/login`
- RevenueCat webhook: `https://mobile-api.novasafe.io/mobile/subscriptions/webhook/revenuecat`

## Architecture

```text
Mobile app  →  https://mobile-api.novasafe.io  →  nginx  →  mobile-vault-backend:3124
```

| Path on server | Role |
|----------------|------|
| `/opt/novasafe/infra/nginx/` | TLS + reverse proxy |
| `/opt/novasafe/mobile-api/` | Docker compose + `.env` |

## DNS (Cloudflare)

Add one record (if not already covered by a wildcard):

| Type | Name | Target | Proxy |
|------|------|--------|-------|
| `A` or `CNAME` | `mobile-api` | same as `novasafe.io` / server IP | Proxied |

If you already proxy `*.novasafe.io`, `mobile-api.novasafe.io` may work without a new record.

Origin certificate must include `*.novasafe.io` or explicitly `mobile-api.novasafe.io`.

## Nginx

Config: `opt/novasafe/infra/nginx/conf.d/mobile-api.conf`

```bash
cd /opt/novasafe/infra/nginx
docker compose exec nginx nginx -t && docker compose exec nginx nginx -s reload
```

## App `.env` (production)

```env
VITE_MOBILE_VAULT_API_URL=https://mobile-api.novasafe.io
```

## Migration from IP / old path

1. Deploy compose at `/opt/novasafe/mobile-api/`
2. Reload nginx with `mobile-api.conf`
3. Add DNS `mobile-api` → server
4. Stop old `/opt/mobile-vault-backend` if it still binds public ports
5. Rebuild mobile app with new API URL
6. Update RevenueCat webhook URL to `https://mobile-api.novasafe.io/mobile/subscriptions/webhook/revenuecat`

## Verify

```bash
curl -sS https://mobile-api.novasafe.io/mobile/health
curl -sS http://127.0.0.1:8085/mobile/health   # localhost debug bind only
```
