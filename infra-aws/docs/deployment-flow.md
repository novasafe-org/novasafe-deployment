# Deployment Flow

Workflow for building and deploying NovaSafe AWS infrastructure and applications.

## Landing application deployment (implemented)

```
GitHub (novasafe-landing-v2)
        ↓
GitHub Actions — deploy-aws.yml
        ↓
Reusable workflow — deploy-frontend-aws.yml
        ↓
npm ci → npm run build (Vite → dist/)
        ↓
GitHub OIDC → assume IAM deploy role
        ↓
aws s3 sync → private S3 bucket (cache-aware)
        ↓
CloudFront invalidation (/*)
        ↓
Deployment complete
```

### Authentication

- **GitHub OIDC only** — no AWS access keys, no GitHub Secrets for credentials
- Deploy role ARN passed as workflow input (from `GitHubOidcStack` output)

### S3 cache strategy

| Path | `Cache-Control` | Notes |
|------|-----------------|-------|
| `/assets/*` | `max-age=31536000, immutable` | Fingerprinted Vite bundles |
| `/index.html` | `max-age=0, must-revalidate` | SPA shell — always revalidate |
| Other root files | Default from sync | `favicon.ico`, `robots.txt`, etc. |

Uses `aws s3 sync --delete` to mirror the build directory.

### CloudFront invalidation

Current: full `/*` invalidation after every deploy (simple, correct for early stage).

**Future optimization:** invalidate only `/index.html` — fingerprinted assets do not need invalidation.

## Infrastructure (CDK)

```bash
cd infra-aws/cdk
npm install
npm run build
npm run synth -- -c env=production
```

### Landing stack bootstrap sequence

1. Deploy `LandingStack` and `GitHubOidcStack`
2. Add ACM DNS validation CNAMEs in Cloudflare
3. Point `novasafe.io` / `www.novasafe.io` to CloudFront
4. Copy stack outputs into `novasafe-landing-v2` `.github/workflows/deploy-aws.yml`
5. Run **Deploy AWS** workflow (manual dispatch)

### Stack outputs used by CI

| Output | Workflow input |
|--------|----------------|
| `BucketName` | `s3-bucket` |
| `DistributionId` | `cloudfront-distribution-id` |
| `GitHubActionsDeployRoleArn` | `aws-role-arn` |

## Environment promotion

```
development  →  staging  →  production
```

Docker/Nginx remains production until DNS cutover per service.

## CI/CD coexistence

| Pipeline | Target | Status |
|----------|--------|--------|
| Docker / Nginx (`ci.yml`) | VPS production | Unchanged |
| AWS CDK | `infra-aws/cdk/` | Infrastructure |
| AWS app deploy (`deploy-aws.yml`) | S3 + CloudFront | Parallel |

See [github-oidc.md](github-oidc.md) for authentication details.
