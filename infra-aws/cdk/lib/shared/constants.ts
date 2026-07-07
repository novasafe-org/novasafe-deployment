/**
 * Global constants for the NovaSafe AWS CDK application.
 */

/** Human-readable application name used in tags and descriptions. */
export const APPLICATION_NAME = 'NovaSafe' as const;

/** Source repository identifier for infrastructure code. */
export const REPOSITORY_NAME = 'novasafe-deployment' as const;

/** Lowercase prefix for physical AWS resource names. */
export const PROJECT_PREFIX = 'novasafe' as const;

/** Node.js runtime version for Lambda functions (future). */
export const NODEJS_RUNTIME_VERSION = 'nodejs22.x' as const;

/** TypeScript compiler target aligned with the CDK project. */
export const TYPESCRIPT_TARGET = 'ES2022' as const;

/** Default infrastructure semantic version applied to tags. */
export const INFRASTRUCTURE_VERSION = '0.1.0' as const;

/** Placeholder team or group responsible for infrastructure. */
export const DEFAULT_OWNER = 'novasafe-org' as const;

/** IaC tooling identifier for the ManagedBy tag. */
export const MANAGED_BY = 'aws-cdk' as const;
