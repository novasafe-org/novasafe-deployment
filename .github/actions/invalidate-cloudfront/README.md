# Invalidate CloudFront

Placeholder composite action for CloudFront cache invalidation after frontend deploys.

## Future responsibility

- Create an invalidation for the given distribution ID
- Support path patterns (`/*`, `/assets/*`, `/index.html`)
- Wait for invalidation completion (optional)

## Inputs

| Input | Required | Description |
|-------|----------|-------------|
| `distribution-id` | Yes | CloudFront distribution ID |
| `paths` | No | Paths to invalidate (default `/*`) |

## Outputs

| Output | Description |
|--------|-------------|
| `invalidated` | Placeholder success flag |

## Consumed by

- `.github/workflows/reusable/deploy-frontend-aws.yml` (future)

## Status

Not implemented. Does not call CloudFront APIs.
