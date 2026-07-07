# Naming Conventions

AWS resource naming standards for NovaSafe. Implementation will live in `cdk/lib/shared/naming.ts`.

## Patterns (planned)

| Element | Pattern | Example |
|---------|---------|---------|
| Stack ID | `Novasafe{Module}{Env}` | `NovasafePlatformApiStaging` |
| Resource prefix | `novasafe-{env}-{service}` | `novasafe-prod-mobile-api` |
| SSM parameter | `/novasafe/{env}/{service}/{key}` | `/novasafe/staging/mobile-api/mongo-uri` |
| S3 bucket | `novasafe-{env}-{purpose}-{account-suffix}` | `novasafe-prod-landing-123456789012` |

## Rules

- Lowercase with hyphens for physical resource names (S3, Lambda functions).
- PascalCase for CDK construct IDs and stack class references.
- Always include **environment** in names to avoid cross-env collisions.
- Apply standard tags from `cdk/lib/shared/tags.ts` (TODO).

## Domains

Domain hostnames are fixed (`novasafe.io` subdomains). Environment-specific hostnames (e.g. `staging-api.novasafe.io`) will be documented in [domains.md](domains.md) if introduced.
