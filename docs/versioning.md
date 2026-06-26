# NovaSafe Versioning & Release Management

## Ticket-based workflow (standard)

NovaSafe uses **GitHub Projects + Issues**, not conventional commits in messages.

1. Create a ticket (Feature / Bug template)
2. Move to **In Progress** on the board → **branch + draft PR** auto-created
3. Merge PR → **version bump + tag + GitHub Release** from ticket labels
4. Push to `main` → **deploy** with semver Docker tags

Full board setup: [PROJECT_SETUP.md](./PROJECT_SETUP.md)

---

## Version bump rules (from ticket labels)

| Ticket label | Semver bump | Changelog section |
|--------------|-------------|-------------------|
| `type:feature` | **Minor** (1.0.0 → 1.1.0) | Added |
| `type:fix` | **Patch** (1.0.0 → 1.0.1) | Fixed |
| `type:breaking` | **Major** (1.0.0 → 2.0.0) | Breaking |
| `type:perf` | Patch | Improved |
| `type:chore`, `no-release` | Skip | — |

Labels can be on the **issue** or copied to the **PR** (automation copies `type:*`).

---

## What developers write in commits

**Anything.** Commit messages are free-form:

```
updated settings page
fix login redirect
wip
```

Release automation reads **ticket labels**, not commit text.

---

## Artifacts

| Artifact | Purpose |
|----------|---------|
| `package.json` `version` | Semver source of truth |
| `CHANGELOG.md` | Updated on each release merge |
| `version.json` | Generated at build (never edit manually) |
| Git tag `vX.Y.Z` | Rollback reference |
| GitHub Release | Public changelog per repo |
| Docker `:vX.Y.Z` | Deployed image version |

---

## Central tooling (`novasafe-deployment`)

```
scripts/versioning/
  generate-build-metadata.mjs
  bump-version.mjs
  append-changelog.mjs

.github/workflows/
  ticket-create-branch.yml    # reusable
  ticket-automation.yml       # issues labeled status:in-progress
  release-on-merge.yml        # reusable — PR merge → release

.github/actions/
  resolve-version/          # CI docker tags
  resolve-bump-type/          # label → patch/minor/major
```

Each app repo contains thin wrappers:

```
.github/workflows/ticket-automation.yml
.github/workflows/release-on-merge.yml
.github/ISSUE_TEMPLATE/feature.yml
.github/ISSUE_TEMPLATE/bug.yml
```

---

## Deploy lifecycle

```
PR merged
  → release-on-merge (bump, tag, GitHub Release)
  → push chore(release) commit to main
  → docker-build / backend-deploy (existing pipelines)
  → resolve-version reads package.json
  → image tagged :vX.Y.Z :latest :sha
  → VPS deploy
```

Release commits use `[skip release]` so they do not re-trigger version bumps.

---

## Runtime version surfaces

| Service | Endpoint / UI |
|---------|----------------|
| Mobile API | `GET /version` |
| Admin API | `GET /version` |
| Landing | Footer + `/version.json` |
| Admin panel | Profile menu + Settings → About |
| Extension | Manifest version + settings About |

---

## Legacy: release-please

**Deprecated** for NovaSafe app repos. Replaced by ticket-based `release-on-merge`.

Do not use `feat:` / `fix:` commit prefixes unless you want them for human readability only — they are **not** required for versioning.

---

## New repository checklist

1. Copy issue templates + `ticket-automation.yml` + `release-on-merge.yml`
2. Create labels (see PROJECT_SETUP.md)
3. Connect GitHub Project automations
4. Set `package.json` version to `1.0.0`
5. Ensure deploy workflow runs on push to `main`
6. Push `novasafe-deployment` tooling first

---

## Security

`version.json` and `/version` expose build metadata only — never secrets.
