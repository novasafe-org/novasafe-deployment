# Backend Lambda environment files

Configuration for AWS Lambda uses the **same `.env` format as VPS Docker**.

## How it works

```
S3 config bucket (BACKEND_CONFIG_BUCKET / mobile-api/.env or admin-api/.env)
        +
Lambda overrides (*.lambda.overrides.example)
        ↓
merge-env-files.mjs
        ↓
Bundled as .env inside lambda.zip
        ↓
loadEnv.ts at cold start (identical to Docker)
```

## S3 layout

Upload once to your private config bucket (see `novasafe-backend` deploy docs):

| Service | S3 key |
|---------|--------|
| Mobile API | `mobile-api/.env` |
| Admin API | `admin-api/.env` |
| Auth (start.novasafe.io) | `auth/.env` |
| App (app.novasafe.io) | `app/.env` |

```bash
BUCKET=novasafe-prod-backend-config-<account-id>
aws s3 cp mobile-api.env s3://$BUCKET/mobile-api/.env --sse AES256
aws s3 cp admin-api.env  s3://$BUCKET/admin-api/.env  --sse AES256
aws s3 cp auth.env       s3://$BUCKET/auth/.env       --sse AES256
aws s3 cp app.env        s3://$BUCKET/app/.env        --sse AES256
```

## Files

| File | Purpose |
|------|---------|
| `mobile-api.lambda.overrides.example` | Lambda-specific overrides for mobile-api |
| `admin-api.lambda.overrides.example` | Lambda-specific overrides for admin-api |
| `auth.lambda.overrides.example` | Documented overrides for auth SSR (also in novasafe-auth-v2 `config/lambda.overrides.example`) |
| `app.lambda.overrides.example` | Documented overrides for app SSR (also in novasafe-app-v2 `config/lambda.overrides.example`) |
| `opt/novasafe-deployment/mobile-api/.env.example` | Template (same keys as production `.env`) |
| `opt/novasafe-deployment/platform/admin-api/.env.example` | Template for admin |

## GitHub setup

Repository variable on `novasafe-backend`:

| Variable | Example |
|----------|---------|
| `BACKEND_CONFIG_BUCKET` | `novasafe-prod-backend-config-793239449172` |

The GitHub OIDC deploy role needs `s3:GetObject` on `arn:aws:s3:::BUCKET/*`.

## Local merge test

```bash
node .github/scripts/merge-env-files.mjs \
  /tmp/lambda.env \
  opt/novasafe-deployment/mobile-api/.env.example \
  infra-aws/config/env/mobile-api.lambda.overrides.example
```
