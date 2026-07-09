import type * as cdk from 'aws-cdk-lib';
import { APPLICATION_NAME } from './constants';

/**
 * Supported NovaSafe deployment environments.
 */
export type EnvironmentName = 'development' | 'staging' | 'production';

/**
 * Strongly typed NovaSafe environment definition.
 */
export interface NovaSafeEnvironment {
  /** Canonical environment name. */
  readonly name: EnvironmentName;
  /** Short identifier used in resource names (e.g. dev, staging, prod). */
  readonly shortName: string;
  /**
   * Target AWS account ID.
   * @todo Replace placeholder values before any deployment.
   */
  readonly awsAccount: string;
  /**
   * Target AWS region.
   * @todo Confirm region per environment before deployment.
   */
  readonly awsRegion: string;
  /** Additional environment-specific tags merged into standard tags. */
  readonly tags: Readonly<Record<string, string>>;
}

const developmentEnvironment: NovaSafeEnvironment = {
  name: 'development',
  shortName: 'dev',
  /** @todo Replace with the development AWS account ID before deployment. */
  awsAccount: '111111111111',
  /** @todo Confirm the development AWS region before deployment. */
  awsRegion: 'eu-west-1',
  tags: {
    Environment: 'development',
    CostProfile: 'free-tier',
  },
};

const stagingEnvironment: NovaSafeEnvironment = {
  name: 'staging',
  shortName: 'staging',
  /** @todo Replace with the staging AWS account ID before deployment. */
  awsAccount: '222222222222',
  /** @todo Confirm the staging AWS region before deployment. */
  awsRegion: 'eu-west-1',
  tags: {
    Environment: 'staging',
    CostProfile: 'free-tier',
  },
};

const productionEnvironment: NovaSafeEnvironment = {
  name: 'production',
  shortName: 'prod',
  /** @todo Replace with the production AWS account ID before deployment. */
  awsAccount: '333333333333',
  /** @todo Confirm the production AWS region before deployment. */
  awsRegion: 'eu-west-1',
  tags: {
    Environment: 'production',
    CostProfile: 'standard',
  },
};

/**
 * Registry of all NovaSafe environments keyed by canonical name.
 */
export const ENVIRONMENTS: Readonly<Record<EnvironmentName, NovaSafeEnvironment>> = {
  development: developmentEnvironment,
  staging: stagingEnvironment,
  production: productionEnvironment,
};

/**
 * Returns the environment definition for the given name.
 */
export function getEnvironment(name: EnvironmentName): NovaSafeEnvironment {
  return ENVIRONMENTS[name];
}

/**
 * Resolves the active environment from CDK context (`-c env=<name>`).
 * Defaults to development when unset or invalid.
 */
export function resolveEnvironmentName(app: cdk.App): EnvironmentName {
  const contextValue = app.node.tryGetContext('env');

  if (
    contextValue === 'development' ||
    contextValue === 'staging' ||
    contextValue === 'production'
  ) {
    return contextValue;
  }

  return 'development';
}

/**
 * Resolves the active environment definition from CDK context.
 */
export function resolveEnvironment(app: cdk.App): NovaSafeEnvironment {
  return getEnvironment(resolveEnvironmentName(app));
}

/**
 * Resolves the target AWS account for CDK deployment.
 *
 * Prefers standard CDK/GitHub Actions environment variables so deploy workflows
 * never rely on placeholder values in {@link ENVIRONMENTS}.
 */
export function resolveAwsAccount(
  environment: NovaSafeEnvironment,
): string {
  return (
    process.env.CDK_DEFAULT_ACCOUNT?.trim() ||
    process.env.AWS_ACCOUNT_ID?.trim() ||
    environment.awsAccount
  );
}

/**
 * Resolves the target AWS region for CDK deployment.
 *
 * Prefers `CDK_DEFAULT_REGION` / `AWS_REGION` from CI, then the environment config.
 */
export function resolveAwsRegion(
  environment: NovaSafeEnvironment,
): string {
  return (
    process.env.CDK_DEFAULT_REGION?.trim() ||
    process.env.AWS_REGION?.trim() ||
    environment.awsRegion
  );
}

/**
 * Converts a NovaSafe environment into CDK `env` props for stack synthesis.
 */
export function toCdkEnvironment(
  environment: NovaSafeEnvironment,
): cdk.Environment {
  return {
    account: resolveAwsAccount(environment),
    region: resolveAwsRegion(environment),
  };
}

/**
 * Human-readable label for stack descriptions.
 */
export function environmentLabel(environment: NovaSafeEnvironment): string {
  return `${APPLICATION_NAME} (${environment.name})`;
}
