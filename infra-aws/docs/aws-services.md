# AWS Services

AWS services planned for NovaSafe serverless infrastructure. **No resources exist yet.**

## In scope

| Service | Planned use |
|---------|-------------|
| **Lambda** | API handlers, auth, background workers |
| **API Gateway** | HTTP APIs for mobile-api, admin-api, auth |
| **S3** | Static site assets (marketing, app shell) |
| **CloudFront** | CDN in front of S3 and optionally API origins |
| **CloudWatch** | Logs, metrics, alarms |
| **IAM** | Least-privilege roles and policies |
| **Secrets Manager** / **SSM Parameter Store** | Runtime configuration (MongoDB URIs, API keys) |
| **SQS** / **EventBridge** | Async workers (future) |

## Out of scope (unchanged)

| System | Role |
|--------|------|
| **MongoDB Atlas** | Primary database |
| **Cloudflare** | DNS, TLS termination at edge, traffic routing during migration |

## Cost

Early stages target **AWS Free Tier** eligibility. Service choices and limits will be documented per environment before production cutover.
