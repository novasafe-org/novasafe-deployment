# Invalidate CloudFront

Creates a CloudFront cache invalidation after S3 deploy.

## Default behaviour

Invalidates `/*` (full distribution flush). This is simple and correct for early-stage deploys.

**Future optimization:** invalidate only `/index.html` once asset fingerprinting + CDN cache policies are proven in production. Fingerprinted `/assets/*` files do not require invalidation.

## Inputs

| Input | Required | Default | Description |
|-------|----------|---------|-------------|
| `distribution-id` | Yes | — | CloudFront distribution ID |
| `paths` | No | `/*` | Invalidation path(s) |

## Outputs

| Output | Description |
|--------|-------------|
| `invalidated` | Success flag |
| `invalidation-id` | CloudFront invalidation ID |
