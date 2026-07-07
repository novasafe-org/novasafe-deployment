# Marketing

Infrastructure for the NovaSafe marketing website hosted at **novasafe.io**.

Maps to repository: `novasafe-landing-v2` (application code deployed separately).

## LandingStack (implemented)

| Resource | Details |
|----------|---------|
| S3 | Private bucket, versioning, SSE-S3, block public access |
| CloudFront | HTTP/2 + HTTP/3, IPv6, HTTPS redirect, SPA error routing |
| OAC | Origin Access Control (not legacy OAI) |
| ACM | `novasafe.io` + `www.novasafe.io`, DNS validation via Cloudflare |
| Policies | SPA cache split, security headers, origin request policy |
| Logging | CloudFront access logs (S3) + CloudWatch log group |

Reusable building blocks live in `lib/shared/static-site/`.
