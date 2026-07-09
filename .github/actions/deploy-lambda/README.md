# Deploy Lambda

Placeholder composite action for deploying backend code to AWS Lambda.

## Future responsibility

- Upload a zip artifact to Lambda (`update-function-code`)
- Optionally publish a new version and update aliases
- Support mobile-api and admin-api function names per environment

## Inputs

| Input | Required | Description |
|-------|----------|-------------|
| `function-name` | Yes | Lambda function name |
| `artifact-path` | No | Path to zip package (default `dist/lambda.zip`) |
| `publish` | No | Publish new version after update (default `false`) |

## Outputs

| Output | Description |
|--------|-------------|
| `deployed` | Placeholder success flag |

## Consumed by

- `.github/workflows/deploy-backend-aws.yml` (future)

## Status

Not implemented. Does not deploy Lambda code.
