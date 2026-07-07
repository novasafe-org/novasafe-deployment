# GitHub Actions

CI/CD strategy for NovaSafe deployments. **No AWS workflows are implemented in this repository yet.**

## Coexisting pipelines

Two deployment paths will run in parallel during migration:

| Pipeline | Target | Status |
|----------|--------|--------|
| **Docker / Nginx** | Current VPS production | Existing workflows under `.github/workflows/` — **unchanged** |
| **AWS CDK** | `infra-aws/cdk/` serverless stack | Future workflows — not added in this task |

## Planned AWS workflow (future)

- Trigger on changes under `infra-aws/cdk/`
- Build TypeScript, run `cdk synth` for validation
- Deploy to `development` on merge to main (or manual dispatch)
- Promote to `staging` / `production` via protected environments and approvals
- Use OIDC federation to AWS (no long-lived access keys in secrets)

## Separation of concerns

Application repos (`novasafe-backend`, `novasafe-app-v2`, etc.) may publish artifacts (Lambda bundles, static assets) via their own pipelines. This repo owns **infrastructure** synthesis and stack deployment.

Existing Docker deployment workflows must not be modified until AWS cutover is intentional.
