# NovaSafe AWS Serverless Infrastructure

This folder contains the new **AWS Serverless** infrastructure for NovaSafe.

## Current state

The existing **Docker/Nginx** deployment (under `opt/novasafe-deployment/`, `docker-compose.yml`, and related configs) remains the **production deployment** during migration. Nothing in this folder affects that deployment until services are deliberately cut over.

## Migration approach

Migration will happen **incrementally**:

1. Stand up serverless environments (dev → staging → production) alongside the current stack.
2. Route traffic per service or subdomain when each piece is validated.
3. Decommission Docker/Nginx resources only after the serverless path is proven in production.

See [docs/migration-plan.md](docs/migration-plan.md) for the planned sequence.

## Technology choices

| Area | Choice |
|------|--------|
| Infrastructure as code | [AWS CDK](https://aws.amazon.com/cdk/) (TypeScript) — code will live in `cdk/` |
| DNS | **Cloudflare** (unchanged) |
| Database | **MongoDB Atlas** (unchanged) |
| Cost target | Stay within the **AWS Free Tier** during early stages of NovaSafe |

## Directory layout

```
infra-aws/
├── README.md           # This file
├── docs/               # Architecture, environments, migration, and operations
├── cdk/                # AWS CDK app (TypeScript) — not initialized yet
├── scripts/            # Deploy, bootstrap, and helper scripts
└── environments/       # Per-environment config (dev, staging, production)
```

## Documentation

| Document | Purpose |
|----------|---------|
| [architecture.md](docs/architecture.md) | High-level serverless architecture |
| [deployment-flow.md](docs/deployment-flow.md) | How changes are built and deployed |
| [environments.md](docs/environments.md) | Dev, staging, and production definitions |
| [domains.md](docs/domains.md) | DNS and domain mapping (Cloudflare) |
| [aws-services.md](docs/aws-services.md) | AWS services in scope |
| [migration-plan.md](docs/migration-plan.md) | Incremental migration from Docker/Nginx |

## Status

**Scaffold only.** CDK is not initialized, no AWS resources exist, and no dependencies are installed. Implementation will follow in later changes.
