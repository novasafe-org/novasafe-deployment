# Configure AWS

Placeholder composite action for GitHub OIDC → AWS credential configuration.

## Future responsibility

- Assume an IAM role using `aws-actions/configure-aws-credentials`
- Export `AWS_REGION` and credentials for subsequent steps
- Support per-environment role ARNs (development, staging, production)

## Inputs

| Input | Required | Description |
|-------|----------|-------------|
| `aws-region` | No | AWS region (default `eu-west-1`) |
| `role-arn` | No | IAM role ARN to assume via OIDC |
| `role-session-name` | No | STS session name |

## Outputs

| Output | Description |
|--------|-------------|
| `configured` | Placeholder success flag |

## Status

Not implemented. Does not authenticate to AWS.
