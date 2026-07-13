#!/usr/bin/env bash
# Download a production .env file from the NovaSafe backend config S3 bucket.
#
# Usage:
#   fetch-s3-env.sh <bucket> <object-key> <local-output>
#
# Example:
#   fetch-s3-env.sh novasafe-prod-backend-config-123456789 mobile-api/.env /tmp/service.env
set -euo pipefail

BUCKET="${1:?S3 bucket name required}"
OBJECT_KEY="${2:?S3 object key required (e.g. mobile-api/.env)}"
LOCAL_OUT="${3:?local output path required}"

if ! command -v aws >/dev/null 2>&1; then
  echo "::error::AWS CLI is required to fetch .env from S3."
  exit 1
fi

mkdir -p "$(dirname "${LOCAL_OUT}")"

if ! aws s3 cp "s3://${BUCKET}/${OBJECT_KEY}" "${LOCAL_OUT}"; then
  echo "::error::Failed to download s3://${BUCKET}/${OBJECT_KEY}"
  echo "::error::Upload your .env with: aws s3 cp .env s3://${BUCKET}/${OBJECT_KEY} --sse AES256"
  exit 1
fi

if [ ! -s "${LOCAL_OUT}" ]; then
  echo "::error::Downloaded .env is empty: s3://${BUCKET}/${OBJECT_KEY}"
  exit 1
fi

echo "[s3-env] fetched s3://${BUCKET}/${OBJECT_KEY} → ${LOCAL_OUT} ($(wc -l < "${LOCAL_OUT}") lines)"
