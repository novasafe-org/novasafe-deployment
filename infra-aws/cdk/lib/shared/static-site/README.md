# Static site (shared)

Reusable **S3 + CloudFront (OAC)** pattern for NovaSafe frontends.

Used by:

- `lib/marketing/landing-stack.ts` — `novasafe.io`
- `lib/platform/app-stack.ts` — future `app.novasafe.io`

## Components

| Module | Responsibility |
|--------|----------------|
| `static-website.ts` | Private S3 bucket, OAC, distribution, logging |
| `certificate-stack.ts` | ACM certificate in `us-east-1` (DNS validation) |
| `cloudfront-policies.ts` | SPA cache, security headers, origin request policies |
| `domain-names.ts` | Apex + `www` alias resolution per environment |

## Design choices

- **Origin Access Control (OAC)** — not legacy Origin Access Identity (OAI)
- **No S3 website endpoint** — CloudFront reads objects via OAC only
- **SPA routing** — 403/404 → `index.html`
- **Cache split** — `/assets/*` long TTL; `index.html` minimal TTL + future invalidation
