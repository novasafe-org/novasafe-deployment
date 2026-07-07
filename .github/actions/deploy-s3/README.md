# Deploy S3

Placeholder composite action for uploading static frontend assets to S3.

## Future responsibility

- Sync a build output directory to the target bucket (`aws s3 sync`)
- Optionally delete removed files (`--delete`)
- Set appropriate cache-control headers per file type

## Inputs

| Input | Required | Description |
|-------|----------|-------------|
| `bucket-name` | Yes | Target S3 bucket |
| `source-directory` | No | Local build output (default `dist`) |
| `delete-removed` | No | Mirror-delete remote objects (default `false`) |

## Outputs

| Output | Description |
|--------|-------------|
| `deployed` | Placeholder success flag |

## Consumed by

- `.github/workflows/reusable/deploy-frontend-aws.yml` (future)

## Status

Not implemented. Does not upload to S3.
