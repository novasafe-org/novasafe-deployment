# Security

Shared security infrastructure for NovaSafe AWS deployments.

| Module / stack | Status | Responsibility |
|----------------|--------|----------------|
| `security-stack.ts` | Placeholder | Shared IAM baselines, secrets references, encryption keys |
| `github-oidc-stack.ts` | **Implemented** | GitHub OIDC provider + deploy role with placeholder inline policies |

See [GitHub OIDC documentation](../../docs/github-oidc.md).
