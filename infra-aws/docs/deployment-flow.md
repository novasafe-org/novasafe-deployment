# Deployment Flow

Workflow for building and deploying NovaSafe AWS infrastructure and applications.

## Deployment model

NovaSafe currently operates a **single production AWS account**. GitHub Actions workflows use **Repository Variables** for AWS configuration — not GitHub Environments.

| Today | Future (multi-account) |
|-------|------------------------|
| One AWS account | Separate dev / staging / prod accounts |
| Repository Variables | GitHub Environments with scoped variables |
| CDK `-c env=production` | Per-environment CDK context selection |

The CDK codebase retains `development`, `staging`, and `production` definitions for future use. Workflows hardcode `production` until multiple AWS environments are needed.

### Required Repository Variables

Configure under **Settings → Secrets and variables → Actions → Variables** (repository level):

| Variable | Example | Purpose |
|----------|---------|---------|
| `AWS_ROLE_ARN` | `arn:aws:iam::123456789012:role/novasafe-prod-github-deploy` | IAM role for OIDC |
| `AWS_REGION` | `ap-south-1` | Primary AWS region for CLI calls |
| `CDK_DEFAULT_ACCOUNT` | `123456789012` | Target AWS account ID |
| `CDK_DEFAULT_REGION` | `ap-south-1` | CDK default region |

**Do not** store AWS access keys in GitHub Secrets. OIDC only.

Caller repositories (e.g. `novasafe-landing-v2`) that use reusable AWS workflows must set `AWS_ROLE_ARN` and `AWS_REGION` as Repository Variables in their own repos.

---

## Infrastructure deployment (CDK — GitHub Actions)

Official pipeline for deploying AWS CDK stacks. No local machine required.

```
GitHub Actions — Deploy Infrastructure (workflow_dispatch)
        ↓
GitHub OIDC → assume IAM role (vars.AWS_ROLE_ARN)
        ↓
Bootstrap check (fail if CDKToolkit missing — no auto-bootstrap)
        ↓
CDK Synth (-c env=production)
        ↓
CDK Diff → upload artifact
        ↓
CDK Deploy (--require-approval never)
        ↓
AWS (CloudFormation stacks)
        ↓
Deployment summary (outputs, duration, run URL)
```

### Why this replaces local deployment

| Local CLI | GitHub Actions pipeline |
|-----------|-------------------------|
| Requires engineer laptop + AWS profile | Runs from any maintainer browser |
| Credentials on disk or in shell history | Short-lived OIDC tokens only |
| No audit trail | Full GitHub Actions logs + artifacts |
| Manual credential management | Centralized Repository Variables |
| Inconsistent Node/CDK versions | Pinned Node 22 + `npm ci` lockfile |

Maintainers deploy via **Actions → Deploy Infrastructure → Run workflow**, selecting a stack.

### Workflow

| Item | Value |
|------|-------|
| File | `.github/workflows/deploy-infrastructure.yml` |
| Trigger | `workflow_dispatch` only (never on push) |
| Auth | GitHub OIDC — **no AWS access keys, no GitHub Secrets** |
| CDK context | `production` (fixed) |

#### Inputs

| Input | Options | Default |
|-------|---------|---------|
| `stack` | Foundation, Landing, All | Landing |

#### Stack mapping (production)

| Selection | CDK stacks deployed |
|-----------|---------------------|
| **Foundation** | `novasafe-prod-foundation`, `novasafe-prod-github-oidc` |
| **Landing** | `novasafe-prod-landing` |
| **All** | `cdk deploy --all` (all registered stacks) |

The IAM role must trust GitHub OIDC (`token.actions.githubusercontent.com`) with a `repo:org/repo:ref:refs/heads/*` subject pattern (not `environment:` subjects). See [github-oidc.md](github-oidc.md).

### One-time bootstrap

CDK bootstrap is **not** automated by the deploy workflow. Use the dedicated bootstrap workflow or run locally once per account/region.

**GitHub Actions (recommended):**

```
Actions → Bootstrap CDK → Run workflow
```

See [bootstrap.md](bootstrap.md) for details, required variables, and multi-region (`us-east-1`) guidance.

**Manual CLI alternative:**

```bash
cd infra-aws/cdk
npm install
npm run build

npx cdk bootstrap aws://<ACCOUNT_ID>/ap-south-1 -c env=production
npx cdk bootstrap aws://<ACCOUNT_ID>/us-east-1 -c env=production
```

The **Deploy Infrastructure** workflow checks for the `CDKToolkit` CloudFormation stack and fails with bootstrap instructions if missing.

### Recommended first deploy sequence

1. Configure Repository Variables on `novasafe-deployment` (`AWS_ROLE_ARN`, `AWS_REGION`, `CDK_DEFAULT_ACCOUNT`, `CDK_DEFAULT_REGION`)
2. Run **Bootstrap CDK** once (bootstraps `ap-south-1` and `us-east-1` automatically)
3. **Deploy Infrastructure** → `Foundation` (OIDC + validation)
4. **Deploy Infrastructure** → `Landing` (see below)
5. Add ACM DNS validation CNAMEs in Cloudflare (from ACM console)
6. Point `novasafe.io` / `www.novasafe.io` DNS to CloudFront
7. Copy Landing stack outputs to `novasafe-landing-v2` Repository Variables / workflow inputs

### Landing stack deployment

```
Actions → Deploy Infrastructure → Landing
        ↓
CDK deploys novasafe-prod-landing (+ nested ACM stack in us-east-1)
        ↓
CloudFormation creates AWS resources
        ↓
Stack outputs published
        ↓
novasafe-landing-v2 deploys React build to S3
```

#### Resources provisioned

| Resource | Purpose |
|----------|---------|
| Private S3 bucket | Landing site content (`index.html`, `/assets/*`) |
| CloudFront distribution | Global CDN with custom domain |
| Origin Access Control (OAC) | Secure S3 origin (not legacy OAI) |
| ACM certificate | TLS for `novasafe.io` + `www.novasafe.io` (us-east-1) |
| Cache policies | SPA shell vs fingerprinted `/assets/*` |
| Origin request policy | Minimal S3 origin forwarding |
| Response headers policy | Security headers (HSTS, CSP, etc.) |
| CloudWatch log group | Operational logging namespace |
| S3 access log bucket | CloudFront access logs (90-day retention) |

DNS validation and Cloudflare CNAME cutover remain manual — Route53 is not used.

#### CloudFormation outputs

| Output | Used for |
|--------|----------|
| `LandingBucketName` | `s3-bucket` in landing deploy workflow |
| `LandingDistributionId` | CloudFront invalidation |
| `LandingDistributionDomainName` | Cloudflare origin / CNAME target |
| `LandingCertificateArn` | Reference / troubleshooting |

View outputs in the workflow job summary or:

```bash
aws cloudformation describe-stacks \
  --stack-name novasafe-prod-landing \
  --query 'Stacks[0].Outputs'
```

#### Validate before deploy

```bash
cd infra-aws/cdk
npm ci && npm run build
CDK_DEFAULT_ACCOUNT=<account> CDK_DEFAULT_REGION=<region> \
  npx cdk synth novasafe-prod-landing -c env=production
CDK_DEFAULT_ACCOUNT=<account> CDK_DEFAULT_REGION=<region> \
  npx cdk diff novasafe-prod-landing -c env=production
```

`cdk diff` should show only Landing stack resources (plus the nested certificate stack in `us-east-1`).

### Local synth (optional validation)

```bash
cd infra-aws/cdk
npm install
npm run build
npm run synth -- -c env=production
```

---

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
GitHub OIDC → assume IAM deploy role (vars.AWS_ROLE_ARN)
        ↓
aws s3 sync → private S3 bucket (cache-aware)
        ↓
CloudFront invalidation (/*)
        ↓
Deployment complete
```

### Authentication

- **GitHub OIDC only** — no AWS access keys, no GitHub Secrets for credentials
- `AWS_ROLE_ARN` and `AWS_REGION` from Repository Variables in the caller repo

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

### Stack outputs used by app CI

| LandingStack output | Caller configuration |
|---------------------|----------------------|
| `LandingBucketName` | `s3-bucket` workflow input |
| `LandingDistributionId` | `cloudfront-distribution-id` workflow input |
| `LandingDistributionDomainName` | Cloudflare DNS / origin |
| `LandingCertificateArn` | Reference only |
| `GitHubActionsDeployRoleArn` (Foundation) | `AWS_ROLE_ARN` Repository Variable |

## CI/CD coexistence

| Pipeline | Target | Status |
|----------|--------|--------|
| Docker / Nginx (`ci.yml`) | VPS production | Unchanged |
| **Bootstrap CDK** (`bootstrap-cdk.yml`) | CDK toolkit | **Implemented** |
| **Deploy Infrastructure** (`deploy-infrastructure.yml`) | CDK stacks | **Implemented** |
| AWS app deploy (`deploy-aws.yml`) | S3 + CloudFront | Parallel |

See [github-oidc.md](github-oidc.md) for authentication details.
