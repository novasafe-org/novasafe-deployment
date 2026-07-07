# Migration Plan

Gradual migration from Docker/Nginx (VPS) to AWS Serverless. Production stays on the current stack until each component is validated.

## Principles

1. **No big-bang** — migrate one service or domain at a time.
2. **Rollback via DNS** — Cloudflare record changes revert traffic quickly.
3. **Parallel infrastructure** — build and test AWS without touching `opt/novasafe-deployment/`.
4. **Cost-conscious** — Free Tier–friendly choices in development and early staging.

## Phases

| Phase | Goal |
|-------|------|
| **0 — Scaffold** | `infra-aws/` layout, CDK skeleton, documentation (current) |
| **1 — Foundation** | CDK bootstrap, development environment, first non-critical workload |
| **2 — Staging parity** | All stacks in staging; integration tests against MongoDB Atlas |
| **3 — Incremental production** | Per-domain cutover: marketing → APIs → app; monitor each step |
| **4 — Decommission** | Retire Docker/Nginx services only when serverless path is stable |

## Suggested cutover order

1. `novasafe.io` / `start.novasafe.io` (static marketing — lowest risk)
2. `mobile-api.novasafe.io` (read-heavy API paths first)
3. `admin-api.novasafe.io`
4. Auth service (coordinate with app session handling)
5. `app.novasafe.io`

Detailed runbooks and acceptance criteria will be added per phase.
