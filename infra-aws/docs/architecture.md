# Architecture

NovaSafe on AWS Serverless. The existing Docker/Nginx deployment remains production until incremental cutover.

## Request flow — Landing (implemented)

```
Cloudflare (DNS, optional proxy/WAF)
        ↓
CloudFront (TLS termination, caching, security headers)
        ↓  Origin Access Control (OAC)
S3 (private bucket — novasafe-landing-v2 artifacts)
```

Cloudflare stays the DNS provider. ACM certificates use DNS validation records added in Cloudflare (no Route53).

## Request flow — APIs (planned)

```
Cloudflare (DNS, TLS)
        ↓
API Gateway (HTTP APIs)
        ↓
Lambda (auth, mobile API, admin API)
        ↓
MongoDB Atlas (database — external to AWS)
```

## Stack modules

| Module | Surfaces | Status | Source repo |
|--------|----------|--------|-------------|
| Marketing / Landing | `novasafe.io`, `www.novasafe.io` | **Implemented** | `novasafe-landing-v2` |
| Marketing / Start | `start.novasafe.io` | Planned | `novasafe-landing-v2` |
| Platform / App | `app.novasafe.io` | Planned (reuses `static-site`) | `novasafe-app-v2` |
| Platform / Auth | auth service | Planned | `novasafe-auth-v2` |
| Platform / API | `mobile-api.novasafe.io` | Planned | `novasafe-backend` |
| Platform / Admin API | `admin-api.novasafe.io` | Planned | `novasafe-backend` |
| Security / OIDC | GitHub Actions auth | Implemented | — |
| Workers | async jobs | Planned | `novasafe-backend` |
| Observability | logs, metrics | Planned | — |

## Landing design highlights

- **Private S3** — block public access; no website hosting endpoint
- **OAC** — CloudFront reads objects via SigV4; legacy OAI is not used
- **SPA routing** — 403/404 responses serve `index.html`
- **Cache split** — `/assets/*` long TTL; `index.html` minimal TTL
- **Free Tier aware** — `PriceClass_100`, log lifecycle, single distribution

## Principles

- **Serverless-first** — no always-on compute for static sites
- **Reusable patterns** — `lib/shared/static-site/` shared with future App stack
- **External data plane** — MongoDB Atlas and Cloudflare stay outside AWS
- **Parallel build** — `infra-aws/` does not modify the VPS deployment
