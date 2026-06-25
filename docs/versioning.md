# NovaSafe Versioning & Release Management

This document defines the standard release process for every NovaSafe repository.

## Overview

| Concern | Tool / artifact |
|--------|------------------|
| Semver source of truth | `package.json` `version` field |
| Commit conventions | [Conventional Commits](https://www.conventionalcommits.org/) |
| Automated bumps & changelog | [release-please](https://github.com/googleapis/release-please) |
| Build metadata | `version.json` (generated — never edit manually) |
| Git tags | `vMAJOR.MINOR.PATCH` (created by release-please on merge) |
| GitHub Releases | Created automatically from `CHANGELOG.md` |
| Docker tags | `:vX.Y.Z`, `:latest`, `:<git-sha>` |
| CI version resolution | `novasafe-deployment/.github/actions/resolve-version` |

## Version format

**Semantic versioning:** `MAJOR.MINOR.PATCH`

| Bump | When |
|------|------|
| **PATCH** | `fix:`, `docs:`, security patches |
| **MINOR** | `feat:` (backward compatible) |
| **MAJOR** | Breaking changes (`feat!:` or `BREAKING CHANGE:` footer) |

## Conventional Commits

```
feat(auth): add passkey enrollment
fix(api): resolve vault sync timeout
docs(landing): update pricing FAQ
chore(ci): bump docker base image
```

Prefixes: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`.

## Release lifecycle

```
Developer merges PRs to main (conventional commits)
        ↓
release-please workflow opens/updates "Release PR"
        ↓
Merge Release PR → tag vX.Y.Z + GitHub Release + CHANGELOG.md
        ↓
Deploy workflow runs on push to main
        ↓
resolve-version reads package.json
        ↓
generate-build-metadata.mjs writes version.json
        ↓
Docker build (build-args: APP_VERSION, GIT_COMMIT, BUILD_NUMBER)
        ↓
Push image :vX.Y.Z + :latest + :sha → deploy to VPS
```

### No manual version edits

Do **not** hand-edit `version.json`. Bump versions only via release-please (which updates `package.json` and `CHANGELOG.md`).

## Repository layout (required)

Every NovaSafe app repo should contain:

```
.github/workflows/
  release-please.yml      # Opens release PRs on push to main
  docker-build.yml          # (if containerized) build + semver docker tags
release-please-config.json
.release-please-manifest.json
CHANGELOG.md
package.json                # version field = semver source
scripts/versioning/generate-build-metadata.mjs
```

Central shared tooling lives in **`novasafe-deployment`**:

```
scripts/versioning/generate-build-metadata.mjs
.github/actions/resolve-version/
.github/workflows/release-please.yml   # reusable workflow
docs/versioning.md                    # this file
```

## Generating `version.json`

```bash
node scripts/versioning/generate-build-metadata.mjs --out public
```

Output example:

```json
{
  "version": "1.4.2",
  "build": "20260625.1830",
  "commit": "d84f213",
  "branch": "main",
  "environment": "production",
  "releasedAt": "2026-06-25T18:30:00Z",
  "repository": "novasafe-landing-v2"
}
```

CI sets `APP_VERSION`, `BUILD_NUMBER`, `GIT_COMMIT`, `RELEASED_AT` automatically.

## Runtime surfaces

| Service | Where version is exposed |
|---------|--------------------------|
| Mobile API (core) | `GET /version`, `GET /version.json`, `/health` includes `version` |
| Admin API | `GET /version`, `GET /version.json`, `/health` includes `version` |
| Landing site | Footer + `/version.json` |
| Admin panel | Profile menu + Settings → About + `/version.json` |
| Auth / App | `/version.json` + `VITE_APP_VERSION` |
| Browser extension | Chrome manifest `version` + settings About |

## Docker image tags

Every production image is tagged:

```
ghcr.io/novasafe-org/<image>:v1.4.2
ghcr.io/novasafe-org/<image>:latest
ghcr.io/novasafe-org/<image>:<git-sha>
```

Rollback = redeploy a previous `vX.Y.Z` tag or GitHub Release.

## Setting up a new repository

1. Set `"version": "1.0.0"` in `package.json`.
2. Copy `scripts/versioning/generate-build-metadata.mjs` from `novasafe-deployment`.
3. Add `release-please-config.json` and `.release-please-manifest.json`.
4. Add `.github/workflows/release-please.yml` calling the reusable workflow.
5. Add `prebuild` script: `node scripts/versioning/generate-build-metadata.mjs --out public`.
6. Update Docker/CI to use `resolve-version` action and pass build-args.
7. Expose version in UI or `/version` API as appropriate.

## Emergency patch release

1. Commit with `fix:` prefix on `main`.
2. Merge the release-please PR (or wait for it to update).
3. Deploy runs automatically with the new patch version.

## Security

`version.json` and `/version` expose **only** build metadata. Never include secrets, tokens, or private env values.

## Future integrations

- **Admin dashboard:** aggregate `/version` from all services.
- **Status page:** correlate incidents with deployment version + `releasedAt`.
