# NovaSafe Mobile Vault API

**Production URL:** [https://mobile-api.novasafe.io](https://mobile-api.novasafe.io)

Deploy on server: `/opt/novasafe/mobile-api/`

See [MOBILE_API_DOMAIN.md](../../MOBILE_API_DOMAIN.md) for DNS, nginx, and migration.

```bash
curl -sS https://mobile-api.novasafe.io/mobile/health
```

App env:

```env
VITE_MOBILE_VAULT_API_URL=https://mobile-api.novasafe.io
```
