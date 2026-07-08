# Deployment Flow

Workflow for building and deploying NovaSafe AWS infrastructure and applications.

## Infrastructure deployment (CDK — GitHub Actions)

Official pipeline for deploying AWS CDK stacks. No local machine required.

```
GitHub Actions — Deploy Infrastructure (workflow_dispatch)
        ↓
GitHub OIDC → assume IAM role (AWS_ROLE_ARN)
        ↓
Bootstrap check (fail if CDKToolkit missing — no auto-bootstrap)
        ↓
CDK Synth
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
| Manual env switching | GitHub Environments gate production |
| Inconsistent Node/CDK versions | Pinned Node 22 + `npm ci` lockfile |

Maintainers deploy via **Actions → Deploy Infrastructure → Run workflow**, selecting environment and stack.

### Workflow

| Item | Value |
|------|-------|
| File | `.github/workflows/deploy-infrastructure.yml` |
| Trigger | `workflow_dispatch` only (never on push) |
| Auth | GitHub OIDC — **no AWS access keys, no GitHub Secrets** |

#### Inputs

| Input | Options | Default |
|-------|---------|---------|
| `environment` | development, staging, production | development |
| `stack` | Foundation, Landing, All | Landing |

#### Stack mapping

| Selection | CDK stacks deployed |
|-----------|---------------------|
| **Foundation** | `novasafe-{env}-foundation`, `novasafe-{env}-github-oidc` |
| **Landing** | `novasafe-{env}-landing` |
| **All** | `cdk deploy --all` (all registered stacks) |

`{env}` short names: `dev`, `staging`, `prod`.

### Required GitHub variables

Configure as **Environment variables** under **Settings → Environments** for each of `development`, `staging`, and `production`.

| Variable | Example | Purpose |
|----------|---------|---------|
| `AWS_ROLE_ARN` | `arn:aws:iam::123456789012:role/novasafe-prod-github-deploy` | IAM role for OIDC (needs CDK/CloudFormation deploy permissions) |
| `AWS_REGION` | `eu-west-1` | Primary AWS region for CLI calls |
| `CDK_DEFAULT_ACCOUNT` | `123456789012` | Target AWS account ID |
| `CDK_DEFAULT_REGION` | `eu-west-1` | CDK default region (usually same as `AWS_REGION`) |

**Do not** store AWS access keys in GitHub Secrets. OIDC only.

The IAM role must trust GitHub OIDC (`token.actions.githubusercontent.com`) and allow CDK deployment actions (CloudFormation, IAM, S3, CloudFront, ACM, etc.). The `GitHubOidcStack` deploy role is a starting point; infrastructure deploy may require broader inline policies than application S3 sync.

### One-time bootstrap

CDK bootstrap is **not** automated by the deploy workflow. Use the dedicated bootstrap workflow or run locally once per account/region.

**GitHub Actions (recommended):**

```
Actions → Bootstrap CDK → Run workflow → select environment
```

See [bootstrap.md](bootstrap.md) for details, required variables, and multi-region (`us-east-1`) guidance.

**Manual CLI alternative:**

```bash
cd infra-aws/cdk
npm install
npm run build

# Primary region
npx cdk bootstrap aws://<ACCOUNT_ID>/eu-west-1 -c env=development

# Required for Landing ACM certificates (CloudFront)
npx cdk bootstrap aws://<ACCOUNT_ID>/us-east-1 -c env=development
```

The **Deploy Infrastructure** workflow checks for the `CDKToolkit` CloudFormation stack and fails with bootstrap instructions if missing.

### Recommended first deploy sequence

1. Replace placeholder account IDs in `infra-aws/cdk/lib/shared/environments.ts`
2. Bootstrap `eu-west-1` and `us-east-1`
3. Configure GitHub Environment variables
4. **Deploy Infrastructure** → `development` / `Foundation` (OIDC + validation)
5. **Deploy Infrastructure** → `development` / `Landing`
6. Add ACM DNS validation CNAMEs in Cloudflare
7. Point DNS to CloudFront
8. Copy stack outputs to application repo workflows (see below)

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

### Stack outputs used by app CI

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
| **Deploy Infrastructure** (`deploy-infrastructure.yml`) | CDK stacks | **Implemented** |
| AWS app deploy (`deploy-aws.yml`) | S3 + CloudFront | Parallel |

See [github-oidc.md](github-oidc.md) for authentication details.
