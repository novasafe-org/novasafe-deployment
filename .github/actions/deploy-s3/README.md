# Deploy S3

Syncs a React/Vite static build to a **private** S3 bucket.

## Cache strategy

| Path | Cache-Control | Rationale |
|------|---------------|-----------|
| `/assets/*` | `max-age=31536000, immutable` | Fingerprinted bundles — safe to cache for 1 year |
| `/index.html` | `max-age=0, must-revalidate` | SPA shell — always revalidate; invalidated on deploy |
| Other root files | Default from `s3 sync` | e.g. `favicon.ico`, `robots.txt` |

Uses `aws s3 sync --delete` to mirror the build directory.

## Inputs

| Input | Required | Default | Description |
|-------|----------|---------|-------------|
| `bucket-name` | Yes | — | Target bucket |
| `source-directory` | No | `dist` | Build output path |
| `delete-removed` | No | `true` | Mirror-delete remote objects |

## Outputs

| Output | Description |
|--------|-------------|
| `deployed` | Success flag |
