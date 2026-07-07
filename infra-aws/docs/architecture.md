# Architecture

Planned high-level architecture for NovaSafe on AWS Serverless. The existing Docker/Nginx deployment remains production until incremental cutover.

## Request flow

```
Cloudflare (DNS, TLS, WAF)
        ↓
CloudFront (static assets, edge caching)
        ↓
S3 (marketing + app static hosting)
```

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

| Module | Surfaces | Source repos |
|--------|----------|--------------|
| Marketing | `novasafe.io`, `start.novasafe.io` | `novasafe-landing-v2` |
| Platform / App | `app.novasafe.io` | `novasafe-app-v2` |
| Platform / Auth | auth service | `novasafe-auth-v2` |
| Platform / API | `mobile-api.novasafe.io` | `novasafe-backend` |
| Platform / Admin API | `admin-api.novasafe.io` | `novasafe-backend` |
| Workers | async jobs | `novasafe-backend` |
| Security | shared IAM, secrets | — |
| Observability | logs, metrics, alarms | — |

## Principles

- **Serverless-first** — Lambda, API Gateway, S3, CloudFront; avoid always-on compute where possible.
- **Free Tier aware** — favor services and limits that keep early-stage costs low.
- **External data plane** — MongoDB Atlas and Cloudflare stay outside AWS.
- **Parallel build** — new infra in `infra-aws/` does not modify the current VPS deployment.

Implementation details will be added as CDK stacks gain resources.
