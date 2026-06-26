#!/usr/bin/env bash
# Remove duplicate issue templates from app repos (org defaults in novasafe-org/.github).
# Canonical templates: v2/default-org-repo/.github/ISSUE_TEMPLATE/
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"

REPOS=(
  "$ROOT/../novasafe-backend"
  "$ROOT/novasafe-deployment"
  "$ROOT/novasafe-landing-v2"
  "$ROOT/novasafe-auth-v2"
  "$ROOT/novasafe-app-v2"
  "$ROOT/novasafe-admin-panel"
  "$ROOT/novasafe-extension"
)

for repo in "${REPOS[@]}"; do
  tpl="$repo/.github/ISSUE_TEMPLATE"
  if [[ -d "$tpl" ]]; then
    rm -rf "$tpl"
    echo "Removed $tpl"
  fi
done

echo "Done. Issue templates are org-wide in novasafe-org/.github only."
echo "Push default-org-repo: cd $ROOT/default-org-repo && git push origin master"
