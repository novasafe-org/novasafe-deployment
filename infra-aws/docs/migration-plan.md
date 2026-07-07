# Migration Plan

> **Placeholder** — This document will describe the incremental migration from Docker/Nginx to AWS Serverless.

## Principles

1. **Production stays on Docker/Nginx** until each migrated component is validated on the serverless path.
2. **Incremental cutover** — migrate one service or traffic slice at a time, not a big-bang switch.
3. **Rollback-friendly** — DNS and routing changes must be reversible via Cloudflare.
4. **Cost-conscious** — favor AWS Free Tier–eligible choices during early stages.

## Future phases (outline)

| Phase | Focus |
|-------|--------|
| 0 | Scaffold repo (`infra-aws/`), CDK bootstrap, dev environment |
| 1 | Non-critical or internal workloads on serverless dev/staging |
| 2 | Staging parity; integration and load testing |
| 3 | Production cutover per service; monitor; decommission Docker only when stable |

Detailed timelines, service order, and acceptance criteria for each phase will be added here as the CDK implementation progresses.
