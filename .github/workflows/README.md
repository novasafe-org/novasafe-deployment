# GitHub Actions — AWS reusable CI/CD

Reusable workflows and composite actions for NovaSafe AWS deployments.

## Status

| Workflow | Status |
|----------|--------|
| [`deploy-frontend-aws.yml`](reusable/deploy-frontend-aws.yml) | **Implemented** — build, OIDC, S3 sync, CloudFront invalidation |
| [`build-frontend.yml`](reusable/build-frontend.yml) | Placeholder |
| [`build-backend.yml`](reusable/build-backend.yml) | Placeholder |
| [`deploy-backend-aws.yml`](reusable/deploy-backend-aws.yml) | Placeholder |

## Deploy frontend flow

```
GitHub (caller repo)
        ↓
reusable/deploy-frontend-aws.yml
        ↓
npm ci → npm run build
        ↓
GitHub OIDC → IAM role
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

```yaml
jobs:
  deploy:
    permissions:
      id-token: write
      contents: read
    uses: novasafe-org/novasafe-deployment/.github/workflows/reusable/deploy-frontend-aws.yml@master
    with:
      application-name: novasafe-landing-v2
      environment: development
      s3-bucket: <LandingStack BucketName output>
      cloudfront-distribution-id: <LandingStack DistributionId output>
      aws-role-arn: <GitHubOidcStack GitHubActionsDeployRoleArn output>
```

No GitHub Secrets required for AWS authentication.

## Coexistence with Docker

Docker/Nginx VPS deployment continues via existing workflows unchanged.
