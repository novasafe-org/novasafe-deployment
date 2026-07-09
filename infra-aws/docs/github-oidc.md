# GitHub OIDC authentication for NovaSafe AWS deployments

NovaSafe uses **GitHub OpenID Connect (OIDC)** so CI/CD workflows can assume AWS IAM roles without storing long-lived access keys.

## Why OIDC

| Approach | Risk |
|----------|------|
| **OIDC (chosen)** | Short-lived credentials per workflow run; trust scoped to org/repo/branch/environment |
| **Access keys in GitHub Secrets** | Long-lived; rotation burden; broad blast radius if leaked |

AWS access keys are **not** used for GitHub Actions deployments.

## Current deployment model

NovaSafe currently operates a **single production AWS account**. Workflows authenticate via **Repository Variables** (`AWS_ROLE_ARN`, `AWS_REGION`) — not GitHub Environments.

The IAM role trust policy must allow `repo:<org>/<repo>:ref:refs/heads/<branch>` subjects. **Do not** require `environment:` subjects until GitHub Environments are enabled — workflows no longer set `environment:` on jobs, so OIDC tokens will not include environment claims.

When multiple AWS environments are introduced later, add GitHub Environments and extend the trust policy with `repo:<org>/<repo>:environment:<name>` patterns.

```
GitHub Actions workflow
        │
        ▼
GitHub OIDC token (JWT)
  aud: sts.amazonaws.com
  sub: repo:<org>/<repo>:ref:refs/heads/<branch>
        │
        ▼
AWS STS AssumeRoleWithWebIdentity
        │
        ▼
Temporary IAM credentials (1 hour max)
        │
        ▼
Future deploy steps (S3, Lambda, CloudFront, API Gateway)
```

## CDK implementation

| Resource | Stack | Purpose |
|----------|-------|---------|
| `AWS::IAM::OIDCProvider` | `GitHubOidcStack` | Trust anchor for `token.actions.githubusercontent.com` |
| `AWS::IAM::Role` | `GitHubOidcStack` | Role assumed by GitHub Actions |
| Inline policies (placeholder) | `GitHubOidcStack` | Documented future permissions only |

Configuration:

- `infra-aws/cdk/config/github.ts` — organization, repository placeholders, branches, environments
- `infra-aws/cdk/lib/shared/github.ts` — trust policy helpers and placeholder ARNs
- `infra-aws/cdk/lib/security/github-oidc-stack.ts` — stack implementation

## Security model

### Trust policy restrictions

The deploy role trust policy requires:

1. **Audience** — `token.actions.githubusercontent.com:aud` equals `sts.amazonaws.com`
2. **Subject** — `token.actions.githubusercontent.com:sub` matches allowed patterns:
   - `repo:<org>/<placeholder-repo>:ref:refs/heads/<branch>` **(required today)**
   - `repo:<org>/<placeholder-repo>:environment:<github-environment>` *(future — when GitHub Environments are enabled)*

Repository names are **placeholders** (`TODO-*-repository`) until real repos are configured.

### Least privilege

- No `AdministratorAccess` managed policy
- Inline policies reference **TODO ARNs** only (no real buckets, Lambdas, distributions, or APIs yet)
- Permissions are grouped and documented per future deployment surface:
  - S3 static deploy
  - Lambda code update
  - CloudFront invalidation
  - API Gateway configuration

### Account-level note

The GitHub OIDC provider is **one per AWS account**. When multiple NovaSafe environments share an account, deploy `GitHubOidcStack` once for the provider or import an existing provider ARN.

## Future deployment flow

1. Deploy `GitHubOidcStack` to the target AWS account/environment
2. Replace repository placeholders in `config/github.ts`
3. Replace TODO ARNs in inline policies with real resource ARNs
4. Workflows read `vars.AWS_ROLE_ARN` from Repository Variables (no `role-to-assume` inputs)

5. Application repos set `AWS_ROLE_ARN` and `AWS_REGION` as Repository Variables and call reusable workflows from `novasafe-deployment`

## Related documentation

- [GitHub Actions workflows](github-actions.md)
- [Deployment flow](deployment-flow.md)
- `.github/workflows/deploy-frontend-aws.yml` — reusable frontend deploy (implemented)
