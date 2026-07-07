# GitHub Actions — AWS reusable CI/CD foundation

This directory contains **placeholder** reusable workflows for future NovaSafe AWS deployments.

## Status

**Foundation only.** No AWS authentication, deployment, or artifact publishing is implemented. Existing Docker deployment workflows in this directory are **unchanged** and remain production.

## Reusable workflows (`reusable/`)

| Workflow | Purpose |
|----------|---------|
| [`build-frontend.yml`](reusable/build-frontend.yml) | Build static frontend artifacts (future) |
| [`build-backend.yml`](reusable/build-backend.yml) | Build backend/Lambda artifacts (future) |
| [`deploy-frontend-aws.yml`](reusable/deploy-frontend-aws.yml) | Deploy frontend to S3 + CloudFront invalidation (future) |
| [`deploy-backend-aws.yml`](reusable/deploy-backend-aws.yml) | Deploy backend to Lambda (future) |

## Composite actions (`../actions/`)

Shared steps consumed by the reusable workflows above. See [actions README](../actions/README.md).

## Consuming repositories

Application repos will call these workflows from their own `.github/workflows/` files:

- `novasafe-landing-v2` — frontend build + deploy
- `novasafe-app-v2` — frontend build + deploy
- `novasafe-auth-v2` — backend build + deploy
- `novasafe-backend` — backend build + deploy

Example (future):

```yaml
jobs:
  deploy:
    uses: novasafe-org/novasafe-deployment/.github/workflows/reusable/deploy-frontend-aws.yml@master
    with:
      application: novasafe-landing-v2
      environment: staging
      bucket-name: novasafe-staging-bucket-landing
      cloudfront-distribution-id: TODO_DISTRIBUTION_ID
    secrets: inherit
```

## Coexistence with Docker

Docker/Nginx VPS deployment continues via existing workflows (`deploy-service.yml`, `deploy-on-change.yml`, etc.). AWS workflows run in parallel during incremental migration.
