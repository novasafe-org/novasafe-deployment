# AWS composite actions

Placeholder composite actions shared by NovaSafe AWS reusable workflows.

## Status

**Foundation only.** No AWS CLI calls, credential configuration, or deployment logic is implemented.

## Actions

| Action | Future responsibility |
|--------|----------------------|
| [`configure-aws/`](configure-aws/) | OIDC authentication and AWS CLI environment setup |
| [`deploy-s3/`](deploy-s3/) | Sync static assets to an S3 bucket |
| [`deploy-lambda/`](deploy-lambda/) | Update Lambda function code from a zip artifact |
| [`invalidate-cloudfront/`](invalidate-cloudfront/) | Create CloudFront cache invalidation |

## Consumed by

- `.github/workflows/reusable/build-frontend.yml`
- `.github/workflows/reusable/build-backend.yml`
- `.github/workflows/reusable/deploy-frontend-aws.yml`
- `.github/workflows/reusable/deploy-backend-aws.yml`

Application repositories (`novasafe-landing-v2`, `novasafe-auth-v2`, `novasafe-app-v2`, `novasafe-backend`) will call the reusable workflows above; they do not reference these actions directly.

## Existing actions

Unrelated composite actions (`resolve-version`, `gitleaks-cli`, etc.) remain unchanged.
