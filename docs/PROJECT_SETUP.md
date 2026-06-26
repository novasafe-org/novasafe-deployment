# GitHub Projects setup (ticket → branch → PR → release)

This is the **NovaSafe standard workflow**. Developers do **not** put `feat:` / `fix:` in commit messages.

Version bumps come from **ticket labels** on GitHub Issues / Project cards.

## Required labels (create once per repository)

In **Issues → Labels**, create:

| Label | Color | Purpose |
|-------|-------|---------|
| `type:feature` | green | Minor version bump on merge |
| `type:fix` | red | Patch version bump on merge |
| `type:breaking` | purple | Major version bump on merge |
| `type:chore` | gray | No version bump (`skip-release`) |
| `type:perf` | blue | Patch bump, changelog "Improved" |
| `status:backlog` | default | New tickets |
| `status:in-progress` | yellow | **Triggers branch + draft PR** |
| `status:review` | optional | For board visibility only |
| `no-release` | gray | Force skip version bump |

Issue templates (`Feature` / `Bug`) apply `type:feature` and `type:fix` automatically.

## GitHub Project board automations

In your **GitHub Project** (org or repo level):

### 1. When item moves to **In Progress**

- **Add label:** `status:in-progress`
- (Optional) Remove `status:backlog`

This triggers `.github/workflows/ticket-automation.yml`, which:

1. Creates branch `ticket/{number}-{slug}`
2. Opens a **draft PR** titled `[#123] Ticket title`
3. PR body includes `Closes #123`
4. Copies `type:*` labels from the issue to the PR
5. Comments on the issue with branch + PR link

### 2. Developer workflow

1. Admin creates ticket from **New issue → Feature** or **Bug**
2. Add ticket to Project board
3. Move to **In Progress** → branch + PR appear automatically
4. Checkout branch, commit normally (any message)
5. Mark PR ready for review → merge

### 3. When PR merges to `main`

`release-on-merge.yml` runs:

1. Reads labels from PR + linked issues (`Closes #…`)
2. Determines bump: `type:feature` → minor, `type:fix` → patch, etc.
3. Bumps `package.json`, updates `CHANGELOG.md`
4. Commits `chore(release): vX.Y.Z [skip release]`
5. Creates Git tag `vX.Y.Z` + **GitHub Release**
6. Existing **docker-build** / **backend-deploy** on `main` deploys with new version

## Flow diagram

```
GitHub Project ticket
        ↓ move to "In Progress"
   label: status:in-progress
        ↓
 ticket-automation.yml
   → branch ticket/42-my-feature
   → draft PR (Closes #42, type:feature)
        ↓ developer commits & merges
 release-on-merge.yml
   → v1.1.0 + CHANGELOG + GitHub Release
        ↓ push to main
 docker-build / backend-deploy
   → GHCR :v1.1.0 + deploy
```

## Repos using this workflow

- `novasafe-deployment` (tooling only)
- `novasafe-backend` (per-service: core + admin-app)
- `novasafe-landing-v2`
- `novasafe-admin-panel`
- `novasafe-auth-v2`
- `novasafe-app-v2`
- `novasafe-extension`

## Troubleshooting

| Problem | Fix |
|---------|-----|
| No branch created | Check `status:in-progress` label was added (Project automation) |
| No version bump after merge | Ticket needs `type:feature` or `type:fix` on issue or PR |
| Wrong bump type | Add correct `type:*` label before merge |
| Skip release for a merge | Add `type:chore` or `no-release` label |
| release-please still running | Remove `release-please.yml` (replaced by this flow) |

## Org-wide labels (recommended)

Create the same labels at **organization level** so every NovaSafe repo inherits them.
