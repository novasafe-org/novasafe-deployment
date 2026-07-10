# Backend Lambda environment files

Configuration for AWS Lambda uses the **same `.env` format as VPS Docker**.

## How it works

```
VPS .env (GitHub secret MOBILE_API_ENV_FILE / ADMIN_API_ENV_FILE)
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

Paste your live VPS `.env` into Environment **production** secrets:

- `MOBILE_API_ENV_FILE`
- `ADMIN_API_ENV_FILE`

Do **not** create separate Lambda env var lists — reuse the VPS file.

## Local merge test

```bash
node .github/scripts/merge-env-files.mjs \
  /tmp/lambda.env \
  opt/novasafe-deployment/mobile-api/.env.example \
  infra-aws/config/env/mobile-api.lambda.overrides.example
```
