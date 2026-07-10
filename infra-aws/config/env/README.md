# Backend Lambda environment files

Configuration for AWS Lambda uses the **same `.env` format as VPS Docker**.

## How it works

```
VPS .env (fetched over SSH during CI — same file Docker uses)
        +
Lambda overrides (*.lambda.overrides.example)
        ↓
merge-env-files.mjs
        ↓
Bundled as .env inside lambda.zip
        ↓
loadEnv.ts at cold start (identical to Docker)
```

## Files

| File | Purpose |
|------|---------|
| `mobile-api.lambda.overrides.example` | Lambda-specific overrides for mobile-api |
| `admin-api.lambda.overrides.example` | Lambda-specific overrides for admin-api |
| `opt/novasafe-deployment/mobile-api/.env.example` | VPS template (same keys as production `.env`) |
| `opt/novasafe-deployment/platform/admin-api/.env.example` | VPS template for admin |

## GitHub setup

**No per-variable GitHub secrets.** Lambda CI fetches the live VPS `.env` over SSH using the same `SSH_*` and `DEPLOY_PATH` secrets as Docker deploy.

Optional fallback (not recommended): Environment secret `MOBILE_API_ENV_FILE` / `ADMIN_API_ENV_FILE` with full file paste — only if VPS fetch is unavailable.

## Local merge test

```bash
node .github/scripts/merge-env-files.mjs \
  /tmp/lambda.env \
  opt/novasafe-deployment/mobile-api/.env.example \
  infra-aws/config/env/mobile-api.lambda.overrides.example
```
