# Deployment Flow

Future workflow for building and deploying NovaSafe AWS infrastructure. **Not implemented yet.**

## Local development (future)

1. Install dependencies: `cd infra-aws/cdk && npm install`
2. Build TypeScript: `npm run build`
3. Select environment: `npx cdk synth -c env=development`
4. Review diff: `npx cdk diff -c env=staging`
5. Deploy: `npx cdk deploy --all -c env=staging` (when stacks contain resources)

## Promotion path

```
development  →  staging  →  production
```

Each environment uses config from `cdk/config/{environment}.ts` and optional overrides in `environments/{environment}/`.

## Coexistence with Docker/Nginx

The current VPS deployment continues to serve production traffic. AWS deploys run in parallel until DNS cutover per service. Rollback is via Cloudflare record changes.

## CI/CD

GitHub Actions workflows for AWS will be added separately. See [github-actions.md](github-actions.md). Existing Docker deployment workflows are unchanged.
