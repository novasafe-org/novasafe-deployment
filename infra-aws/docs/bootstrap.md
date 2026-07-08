# CDK Bootstrap

One-time preparation of an AWS account and region for AWS CDK deployments.

## Why bootstrap is required

CDK deploys infrastructure via CloudFormation. Before the first deployment, CDK must provision a **bootstrap stack** (`CDKToolkit`) in the target account/region. This stack provides:

- An S3 bucket for staging large CloudFormation templates and assets
- IAM roles used during deployment (file publishing, deploy, lookup)
- SSM parameters recording the bootstrap version

Without bootstrap, `cdk deploy` fails because CDK has nowhere to publish assets.

Bootstrap does **not** create application resources (no S3 landing buckets, no CloudFront, no Lambda). It only prepares the CDK toolkit.

## How often to run

| Scope | Frequency |
|-------|-----------|
| Per AWS account + region | **Once** |
| Per NovaSafe environment | Once per linked AWS account |

Re-run only when:

- Bootstrapping a **new** AWS account or region
- AWS/CDK documentation recommends upgrading the bootstrap stack after a major CDK version change
- The `CDKToolkit` stack was deleted manually

## GitHub Actions workflow

| Item | Value |
|------|-------|
| Workflow | `.github/workflows/bootstrap-cdk.yml` |
| UI name | **Bootstrap CDK** |
| Trigger | `workflow_dispatch` (manual only) |

### Steps

```
Actions → Bootstrap CDK → Run workflow
        ↓
Select environment (development / staging / production)
        ↓
GitHub OIDC → assume IAM role
        ↓
cdk bootstrap aws://<account>/<region>
        ↓
Success summary (account, region, bootstrap version)
```

### Authentication

- **GitHub OIDC only** — no AWS access keys, no GitHub Secrets
- The IAM role (`AWS_ROLE_ARN`) must trust `token.actions.githubusercontent.com` and allow `cloudformation:*`, `s3:*`, `iam:*`, `ssm:*`, and related bootstrap permissions on the target account

### Required GitHub variables

Configure under **Settings → Environments → {environment} → Environment variables**:

| Variable | Example | Purpose |
|----------|---------|---------|
| `AWS_ROLE_ARN` | `arn:aws:iam::123456789012:role/novasafe-dev-github-deploy` | OIDC-assumable IAM role |
| `AWS_REGION` | `eu-west-1` | Region to bootstrap |
| `CDK_DEFAULT_ACCOUNT` | `123456789012` | Target AWS account ID |

## Multi-region note (Landing stack)

NovaSafe Landing uses ACM certificates in **`us-east-1`** (CloudFront requirement) while primary infrastructure runs in **`eu-west-1`**.

Bootstrap **both** regions before deploying Landing:

1. Run **Bootstrap CDK** with `AWS_REGION=eu-west-1`
2. Run **Bootstrap CDK** again with `AWS_REGION=us-east-1` (update the environment variable, or use a dedicated environment)

The **Deploy Infrastructure** workflow checks for `CDKToolkit` in both regions when deploying Landing or All stacks.

## Manual alternative (local CLI)

```bash
cd infra-aws/cdk
npm install
npm run build
npx cdk bootstrap aws://<ACCOUNT_ID>/eu-west-1 -c env=development
npx cdk bootstrap aws://<ACCOUNT_ID>/us-east-1 -c env=development
```

Prefer the GitHub workflow for auditability and consistent OIDC authentication.

## What this workflow does NOT do

- Does not deploy `FoundationStack`, `LandingStack`, or any application stack
- Does not modify Docker/VPS deployment
- Does not run automatically on push

After bootstrap succeeds, use **Deploy Infrastructure** to provision CDK stacks.

## Related docs

- [deployment-flow.md](deployment-flow.md) — full infrastructure and application deploy pipeline
- [github-oidc.md](github-oidc.md) — OIDC trust and IAM role design
