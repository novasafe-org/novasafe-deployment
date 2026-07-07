# AWS Services

AWS services used and planned for NovaSafe serverless infrastructure.

## In use

| Service | Stack | Use |
|---------|-------|-----|
| **S3** | LandingStack | Private content bucket + CloudFront access logs |
| **CloudFront** | LandingStack | CDN, TLS, SPA routing, compression (gzip/brotli) |
| **ACM** | LandingStack | TLS certificate (`novasafe.io`, `www.novasafe.io`) |
| **IAM (OIDC)** | GitHubOidcStack | GitHub Actions authentication |
| **CloudWatch Logs** | LandingStack | Operational log group for landing CDN |
| **CloudFormation** | CDK | All stacks |

### Landing stack CloudFront policies

| Policy type | Purpose |
|-------------|---------|
| Cache (HTML) | Minimal TTL for `index.html` / SPA shell |
| Cache (assets) | Aggressive TTL for `/assets/*` |
| Origin request | No cookies/query forwarding to S3 |
| Response headers | HSTS, CSP (placeholder), frame deny, COOP/CORP |

**Origin Access Control (OAC)** is used — not legacy Origin Access Identity (OAI).

## Planned

| Service | Planned use |
|---------|-------------|
| **Lambda** | API handlers, auth, workers |
| **API Gateway** | HTTP APIs for mobile-api, admin-api, auth |
| **Secrets Manager** / **SSM** | Runtime configuration |
| **SQS** / **EventBridge** | Async workers |

## Out of scope (unchanged)

| System | Role |
|--------|------|
| **MongoDB Atlas** | Primary database |
| **Cloudflare** | DNS, optional proxy/WAF |
| **Route53** | Not used — DNS stays in Cloudflare |

## Free Tier considerations

| Service | Early-stage approach |
|---------|---------------------|
| S3 | Versioning on; lifecycle on log bucket (90-day expiry) |
| CloudFront | `PriceClass_100`; single distribution per site |
| ACM | Free for CloudFront certificates |
| CloudWatch Logs | 1-month retention on landing log group |
| Data transfer | Monitor via CloudFront and S3 metrics |

Replace placeholder AWS account IDs before deploying to real accounts.
