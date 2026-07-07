# Shared

Cross-cutting configuration reused by every NovaSafe CDK stack.

| Module | Responsibility |
|--------|----------------|
| `constants.ts` | Application name, repository, runtime versions, prefixes |
| `environments.ts` | Strongly typed development, staging, and production definitions |
| `domains.ts` | Hostname configuration per environment |
| `naming.ts` | Consistent AWS resource and stack naming helpers |
| `tags.ts` | Standard resource tags (`Application`, `Environment`, etc.) |
| `types.ts` | `NovaSafeStackProps` and stack prop merging |
| `validation.ts` | Shared configuration validation |

All modules are implemented; stacks consume them but provision no AWS resources yet.
