# NovaSafe AWS Serverless Infrastructure

This folder contains the new **AWS Serverless** infrastructure for NovaSafe, managed with **AWS CDK (TypeScript)**.

## Current state

The existing **Docker/Nginx** deployment (`opt/novasafe-deployment/`, root `docker-compose.yml`, and related configs) remains **production** during migration. Nothing here affects that stack until services are deliberately cut over.

## Migration approach

Migration is **incremental**:

1. Stand up serverless environments (development → staging → production) in parallel.
2. Route traffic per service or subdomain when each piece is validated.
3. Decommission Docker/Nginx resources only after the serverless path is proven.

See [docs/migration-plan.md](docs/migration-plan.md).

## Technology choices

| Area | Choice |
|------|--------|
| Infrastructure as code | AWS CDK v2 (TypeScript) in `cdk/` |
| Runtime | Node.js 22 |
| DNS | **Cloudflare** |
| Database | **MongoDB Atlas** (not on AWS) |
| Cost target | AWS Free Tier during early stages |

## Directory layout

```
infra-aws/
├── README.md
├── docs/               # Architecture and operations documentation
├── cdk/                # AWS CDK application (skeleton — no resources yet)
├── scripts/            # Deploy and helper scripts (future)
└── environments/       # Per-environment overrides (development, staging, production)
```

## CDK project

The CDK app lives in [`cdk/`](cdk/). Stack modules are organized by domain:

| Module | Responsibility |
|--------|----------------|
| `lib/foundation/` | Shared foundation |
| `lib/marketing/` | `novasafe.io`, `start.novasafe.io` |
| `lib/platform/` | Auth, app, mobile API, admin API |
| `lib/workers/` | Background processing |
| `lib/security/` | IAM, secrets baselines |
| `lib/observability/` | Monitoring and logging |

**Do not** bootstrap, synthesize, or deploy until implementation tasks add resources.

## Documentation

| Document | Purpose |
|----------|---------|
| [architecture.md](docs/architecture.md) | Planned serverless architecture |
| [deployment-flow.md](docs/deployment-flow.md) | Build and deploy workflow |
| [environments.md](docs/environments.md) | Environment definitions |
| [domains.md](docs/domains.md) | Domain and DNS mapping |
| [aws-services.md](docs/aws-services.md) | AWS services in scope |
| [github-actions.md](docs/github-actions.md) | Coexisting CI/CD pipelines |
| [migration-plan.md](docs/migration-plan.md) | Incremental migration strategy |
| [naming-conventions.md](docs/naming-conventions.md) | AWS naming standards |
