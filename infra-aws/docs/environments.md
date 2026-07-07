# Environments

Three AWS deployment environments. Configuration stubs live in `cdk/config/`; environment-specific files may be added under `environments/`.

## development

- Purpose: experimentation and feature validation
- Lowest cost; permissive access
- May share an AWS account with staging initially

## staging

- Purpose: pre-production integration and QA
- Mirrors production topology where practical
- Validates migrations before live cutover

## production

- Purpose: live serverless traffic (after incremental migration)
- Strict change control and monitoring
- Docker/Nginx remains authoritative until each service is cut over

## Context selection (future)

CDK context flag: `-c env=development|staging|production`

Account IDs, regions, and stack naming will be documented here once accounts are provisioned.
