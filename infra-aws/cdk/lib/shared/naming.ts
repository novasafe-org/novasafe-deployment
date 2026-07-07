import { PROJECT_PREFIX } from './constants';
import type { NovaSafeEnvironment } from './environments';

/** Logical stack and resource components used in naming helpers. */
export type StackComponent =
  | 'foundation'
  | 'landing'
  | 'auth'
  | 'app'
  | 'mobile-api'
  | 'admin-api'
  | 'workers'
  | 'security'
  | 'observability'
  | 'github-oidc';

/**
 * Builds a consistent physical name segment: `{prefix}-{env}-{suffix}`.
 */
export function physicalName(
  environment: NovaSafeEnvironment,
  suffix: string,
): string {
  return `${PROJECT_PREFIX}-${environment.shortName}-${suffix}`.toLowerCase();
}

/**
 * CDK stack identifier and CloudFormation stack name.
 */
export function stackName(
  environment: NovaSafeEnvironment,
  component: StackComponent,
): string {
  return physicalName(environment, component);
}

/**
 * S3 bucket name (future). Account suffix may be appended at implementation time.
 */
export function bucketName(
  environment: NovaSafeEnvironment,
  purpose: string,
): string {
  return physicalName(environment, `bucket-${purpose}`);
}

/**
 * Lambda function name (future).
 */
export function lambdaName(
  environment: NovaSafeEnvironment,
  purpose: string,
): string {
  return physicalName(environment, `fn-${purpose}`);
}

/**
 * CloudFront distribution construct name (future).
 */
export function distributionName(
  environment: NovaSafeEnvironment,
  purpose: string,
): string {
  return physicalName(environment, `cdn-${purpose}`);
}

/**
 * API Gateway name (future).
 */
export function apiName(
  environment: NovaSafeEnvironment,
  purpose: string,
): string {
  return physicalName(environment, `api-${purpose}`);
}
