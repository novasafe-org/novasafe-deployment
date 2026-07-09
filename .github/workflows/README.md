# GitHub Actions — AWS reusable CI/CD

Reusable workflows and composite actions for NovaSafe AWS deployments.

## Deployment model

**Production only** — single AWS account. All AWS configuration uses **Repository Variables** (`vars.*`), not GitHub Environments.

| Variable | Purpose |
|----------|---------|
| `AWS_ROLE_ARN` | OIDC-assumable IAM role |
| `AWS_REGION` | Primary AWS region |
| `CDK_DEFAULT_ACCOUNT` | AWS account ID (CDK workflows) |
| `CDK_DEFAULT_REGION` | CDK default region (CDK workflows) |

GitHub Environments will be introduced when multiple AWS accounts/environments are needed.

## Status

| Workflow | Status |
|----------|--------|
| [`bootstrap-cdk.yml`](bootstrap-cdk.yml) | **Implemented** — one-time CDK bootstrap via OIDC (manual dispatch) |
| [`deploy-infrastructure.yml`](deploy-infrastructure.yml) | **Implemented** — CDK synth/diff/deploy via OIDC (manual dispatch) |
| [`deploy-frontend-aws.yml`](reusable/deploy-frontend-aws.yml) | **Implemented** — build, OIDC, S3 sync, CloudFront invalidation |
| [`build-frontend.yml`](reusable/build-frontend.yml) | Placeholder |
| [`build-backend.yml`](reusable/build-backend.yml) | Placeholder |
| [`deploy-backend-aws.yml`](reusable/deploy-backend-aws.yml) | Placeholder |

## Bootstrap CDK (one-time)

```
Actions → Bootstrap CDK → Run workflow
        ↓
GitHub OIDC → IAM role (Repository Variables)
        ↓
cdk bootstrap aws://<account>/<region>
```

See [`infra-aws/docs/bootstrap.md`](../infra-aws/docs/bootstrap.md).

## Deploy infrastructure (CDK)

```
Actions → Deploy Infrastructure → Run workflow
        ↓
Select stack (Foundation / Landing / All)
        ↓
GitHub OIDC → IAM role (Repository Variables)
        ↓
Bootstrap check → CDK synth → CDK diff (artifact) → CDK deploy
        ↓
Deployment summary
```

CDK targets `production` stacks (`novasafe-prod-*`). See [`infra-aws/docs/deployment-flow.md`](../infra-aws/docs/deployment-flow.md).

## Deploy frontend flow

```
GitHub (caller repo)
        ↓
reusable/deploy-frontend-aws.yml
        ↓
npm ci → npm run build
        ↓
GitHub OIDC → IAM role (caller Repository Variables)
        ↓
aws s3 sync (cache-aware)
        ↓
CloudFront invalidation (/*)
        ↓
Deployment complete
```

## Composite actions

| Action | Purpose |
|--------|---------|
| [`configure-aws`](../actions/configure-aws/) | OIDC credential setup |
| [`deploy-s3`](../actions/deploy-s3/) | SPA-aware `aws s3 sync` |
| [`invalidate-cloudfront`](../actions/invalidate-cloudfront/) | Post-deploy cache flush |

## Example (novasafe-landing-v2)

Set Repository Variables on `novasafe-landing-v2`:

- `AWS_ROLE_ARN` — from `GitHubOidcStack` output `GitHubActionsDeployRoleArn`
- `AWS_REGION` — e.g. `ap-south-1`

```yaml
jobs:
  deploy:
    permissions:
      id-token: write
      contents: read
    uses: novasafe-org/novasafe-deployment/.github/workflows/reusable/deploy-frontend-aws.yml@master
    with:
      application-name: novasafe-landing-v2
      s3-bucket: <LandingStack BucketName output>
      cloudfront-distribution-id: <LandingStack DistributionId output>
```

No GitHub Secrets required for AWS authentication.

## Coexistence with Docker

Docker/Nginx VPS deployment continues via existing workflows unchanged.
