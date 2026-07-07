# NovaSafe AWS CDK

TypeScript [AWS CDK v2](https://aws.amazon.com/cdk/) application for NovaSafe serverless infrastructure.

## Status

**Architecture skeleton only.** Stack classes exist as placeholders with no AWS resources. Do not bootstrap, synthesize, or deploy until implementation tasks add resources and CI wiring.

## Layout

| Path | Purpose |
|------|---------|
| `bin/novasafe.ts` | CDK app entry point |
| `lib/shared/` | Cross-cutting constants, domains, naming, tags |
| `lib/foundation/` | Shared foundation (bootstrap, networking baseline) |
| `lib/marketing/` | Marketing sites (`novasafe.io`, `start.novasafe.io`) |
| `lib/platform/` | Auth, app, mobile API, admin API |
| `lib/workers/` | Background processing (queues, schedulers) |
| `lib/security/` | IAM, secrets, security baselines |
| `lib/observability/` | Logging, metrics, alarms |
| `config/` | Per-environment configuration objects |

## Prerequisites

- Node.js 22+
- AWS credentials (only when deploying — not required for this skeleton)

## Commands (after `npm install`)

```bash
npm run build    # Compile TypeScript
npm run cdk synth -c env=development   # Future: synthesize templates
```

The existing Docker/Nginx deployment is unchanged and remains production during migration.
