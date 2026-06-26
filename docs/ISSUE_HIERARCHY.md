# Epic → Story → Task hierarchy

NovaSafe uses structured issue templates for planning and delivery. Pick the right template when clicking **New issue**.

## All templates

### Planning hierarchy

| Template | Title prefix | Labels | Release on merge |
|----------|--------------|--------|------------------|
| **Epic** | `[EPIC]` | `epic` | — |
| **Story** | `[STORY]` | `story` | — |
| **Task** | `[TASK]` | `subtask` | From `type:*` if added |

### Delivery (code changes)

| Template | Title prefix | Labels | Version bump |
|----------|--------------|--------|--------------|
| **Feature** | `[FEATURE]` | `type:feature` | Minor |
| **Bug** | `[BUG]` | `type:fix` | Patch |
| **Hotfix** | `[HOTFIX]` | `type:fix`, `hotfix` | Patch |
| **Breaking change** | `[BREAKING]` | `type:breaking` | Major |
| **Performance** | `[PERF]` | `type:perf` | Patch (Improved) |
| **Chore** | `[CHORE]` | `type:chore` | Skip |
| **Documentation** | `[DOCS]` | `type:chore` | Skip |

### Investigation & security

| Template | Title prefix | Labels | Release |
|----------|--------------|--------|---------|
| **Research** | `[RESEARCH]` | `research` | Skip unless `type:*` added |
| **Security** | `[SECURITY]` | `security` | Add `type:fix` / `type:feature` when shipping |
| **Audit** | `[AUDIT]` | `audit` | Usually skip |

Canonical templates: **`novasafe-org/.github`** repository (local clone: `v2/default-org-repo`).

Do not copy templates into individual app repos — GitHub applies org defaults automatically.

Sync to other repos: **deprecated** — edit `.github/ISSUE_TEMPLATE/` in `novasafe-org/.github` only.

## Title format (hierarchy)

| Level | Prefix | ID pattern | Example |
|-------|--------|------------|---------|
| **Epic** | `[EPIC]` | Short program code | `[EPIC] SEC: End-to-end security audit` |
| **Story** | `[STORY]` | `{EPIC}-{n}` | `[STORY] SEC-02: Authentication hardening` |
| **Task** | `[TASK]` | `{STORY}.{n}` | `[TASK] SEC-02.1: Add auth rate limiting` |

Use the **Epic**, **Story**, or **Task** template when creating issues (not free-form titles).

## Linking hierarchy

GitHub does not infer parent/child from the title. After creating issues:

1. Open the **parent** issue (Epic or Story).
2. At the bottom of the description → **Create sub-issue** → **Add existing issue**.
3. Select the child Story or Task.

Or on the child: sidebar **Relationships** → set parent issue.

On the **Project board**, use the **Parent issue** column and group by parent.

## Labels

| Level | Default labels | Release labels (tasks that merge code) |
|-------|----------------|----------------------------------------|
| Epic | `epic`, `status:backlog` | — |
| Story | `story`, `status:backlog` | — |
| Task | `subtask`, `status:backlog` | Add `type:feature`, `type:fix`, etc. |

Move to **In Progress** on the project → adds `status:in-progress` → **ticket automation** creates `ticket/{n}-{slug}` branch + draft PR.

## Project fields

Set on the project board (or via backlog importer):

- **Priority** — Urgent / High / Medium / Low
- **Work Type** — Feature / Fix / Research / Security / Audit / Chore
- **Module** — Authentication, Vault, Infra, …
- **Security Phase** — for security backlog milestones

## CSV import

Bulk imports use the same title prefixes (`[STORY]`, `[TASK]`). Add a future `Parent` column to auto-link sub-issues via API.

## Where templates live

Canonical templates: `novasafe-deployment/.github/ISSUE_TEMPLATE/`

Copy to any repo that files issues, or keep issues centralized in `novasafe-backend`.
