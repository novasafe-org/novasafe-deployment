# Domains

NovaSafe domain mapping for the serverless stack. DNS remains in **Cloudflare**.

## Frontend

| Domain | Purpose | Stack module |
|--------|---------|--------------|
| `novasafe.io` | Marketing landing | `lib/marketing/` |
| `start.novasafe.io` | Marketing start flow | `lib/marketing/` |
| `app.novasafe.io` | Authenticated web app | `lib/platform/app-stack` |

## Backend

| Domain | Purpose | Stack module |
|--------|---------|--------------|
| `mobile-api.novasafe.io` | Mobile API | `lib/platform/api-stack` |
| `admin-api.novasafe.io` | Admin API | `lib/platform/admin-api-stack` |

## Migration routing

During incremental migration, Cloudflare can point a subdomain at either the existing Nginx origin or the new CloudFront/API Gateway endpoint. Cutover is per-domain, with quick rollback by reverting DNS.

See also repository root: `MOBILE_API_DOMAIN.md`, `novasafe.io.conf`.
