# Deployment Flow

Workflow for building and deploying NovaSafe AWS infrastructure and applications.

## Infrastructure (CDK)

```bash
cd infra-aws/cdk
npm install
npm run build
npm run synth -- -c env=production
# npm run diff / deploy when AWS accounts are configured
```

### Landing stack bootstrap sequence

1. **Synth & deploy** `LandingStack` for the target environment
2. **ACM DNS validation** — add the CNAME records from ACM to Cloudflare (manual; no Route53)
3. **Wait** for certificate status `ISSUED`
4. **Cloudflare DNS** — point `novasafe.io` / `www.novasafe.io` CNAME to the CloudFront distribution domain (proxied or DNS-only per security review)
5. **Deploy application** — `novasafe-landing-v2` build artifacts uploaded via future GitHub Actions workflow

## Landing application deployment (future)

```
novasafe-landing-v2 CI
        ↓
build (npm run build)
        ↓
GitHub OIDC → assume deploy role
        ↓
aws s3 sync dist/ → landing bucket
        ↓
CloudFront invalidation (/index.html)
        ↓
Live at novasafe.io
```

Reusable workflows (placeholders today):

- `.github/workflows/reusable/build-frontend.yml`
- `.github/workflows/reusable/deploy-frontend-aws.yml`

Stack outputs consumed by CI:

| Output | Use |
|--------|-----|
| `BucketName` | `aws s3 sync` target |
| `DistributionId` | CloudFront invalidation |
| `DistributionDomainName` | Cloudflare origin / CNAME target |
| `CertificateArn` | Reference / troubleshooting |

### Cache invalidation strategy

| Path | Strategy |
|------|----------|
| `/assets/*` | Filename hashing — no invalidation needed |
| `/index.html` | Invalidate on every deploy (future workflow step) |
| SPA routes | Served from cached `index.html` shell |

## Environment promotion

```
development  →  staging  →  production
```

Docker/Nginx remains production until DNS cutover per service.

## CI/CD coexistence

| Pipeline | Target |
|----------|--------|
| Docker / Nginx | Current VPS production (unchanged) |
| AWS CDK | `infra-aws/cdk/` infrastructure |
| AWS app deploy | Reusable workflows + OIDC (future) |

See [github-oidc.md](github-oidc.md) for authentication details.
