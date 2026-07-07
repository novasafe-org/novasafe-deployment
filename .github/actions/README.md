# AWS composite actions

Composite actions shared by NovaSafe AWS reusable workflows.

## Status

| Action | Status |
|--------|--------|
| [`configure-aws/`](configure-aws/) | **Implemented** — GitHub OIDC via `aws-actions/configure-aws-credentials` |
| [`deploy-s3/`](deploy-s3/) | **Implemented** — SPA-aware `aws s3 sync` with cache headers |
| [`invalidate-cloudfront/`](invalidate-cloudfront/) | **Implemented** — `aws cloudfront create-invalidation` |
| [`deploy-lambda/`](deploy-lambda/) | Placeholder |

## Authentication

OIDC only — no AWS access keys, no GitHub Secrets for credentials.

## Consumed by

- `.github/workflows/reusable/deploy-frontend-aws.yml` (implemented)
- `.github/workflows/reusable/deploy-backend-aws.yml` (future)

Application repos call reusable **workflows**, not these actions directly.

## Existing actions

Unrelated composite actions (`resolve-version`, `gitleaks-cli`, etc.) remain unchanged.
