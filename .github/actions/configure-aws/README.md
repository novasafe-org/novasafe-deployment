# Configure AWS

Configures short-lived AWS credentials using **GitHub OIDC** (`aws-actions/configure-aws-credentials`).

## Inputs

| Input | Required | Description |
|-------|----------|-------------|
| `aws-region` | Yes | AWS region |
| `role-arn` | Yes | IAM role ARN from `GitHubOidcStack` |
| `role-session-name` | No | STS session name |

## Outputs

| Output | Description |
|--------|-------------|
| `configured` | Success flag |

No GitHub Secrets or long-lived access keys are used.
