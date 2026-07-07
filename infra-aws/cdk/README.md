# NovaSafe AWS CDK

TypeScript [AWS CDK v2](https://aws.amazon.com/cdk/) application for NovaSafe serverless infrastructure.

## Status

Engineering foundation initialized. Shared modules, placeholder stacks, tests, and synth tooling are in place. **No AWS resources are provisioned.**

## Prerequisites

- Node.js 22+
- npm

## Commands

```bash
npm install
npm run build
npm run lint
npm test
npm run synth
npm run synth -- -c env=staging
```

## Layout

| Path | Purpose |
|------|---------|
| `bin/novasafe.ts` | CDK app — instantiates all placeholder stacks |
| `lib/shared/` | Environments, domains, naming, tags, validation |
| `lib/foundation/` | Global configuration anchor stack |
| `lib/marketing/` | `novasafe.io`, `start.novasafe.io` |
| `lib/platform/` | Auth, app, mobile API, admin API |
| `lib/workers/` | Background processing |
| `lib/security/` | IAM and secrets baselines |
| `lib/observability/` | Monitoring and logging |
| `config/` | Per-environment config entry points |

## Environment selection

Pass CDK context to target an environment:

```bash
npm run synth -- -c env=development   # default
npm run synth -- -c env=staging
npm run synth -- -c env=production
```

Placeholder AWS account IDs (`111…`, `222…`, `333…`) must be replaced before any deployment.

The existing Docker/Nginx deployment remains production during migration.
