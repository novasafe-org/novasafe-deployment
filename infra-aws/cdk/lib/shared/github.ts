import { PROJECT_PREFIX } from './constants';
import type { NovaSafeEnvironment } from './environments';

/** GitHub Actions OIDC issuer URL. */
export const GITHUB_OIDC_PROVIDER_URL = 'https://token.actions.githubusercontent.com' as const;

/** Required OIDC audience for AWS STS. */
export const GITHUB_OIDC_AUDIENCE = 'sts.amazonaws.com' as const;

/**
 * Placeholder repository reference used in trust policies and documentation.
 */
export interface GitHubRepositoryRef {
  readonly key: string;
  readonly placeholder: string;
}

/**
 * GitHub OIDC subject configuration derived from environment config.
 */
export interface GitHubOidcSubjectConfig {
  readonly organization: string;
  readonly repositories: readonly GitHubRepositoryRef[];
  readonly branches: readonly string[];
  readonly deploymentEnvironments: readonly string[];
}

/**
 * Builds the IAM role name for GitHub Actions deployments.
 */
export function githubDeployRoleName(environment: NovaSafeEnvironment): string {
  return `${PROJECT_PREFIX}-${environment.shortName}-github-deploy`;
}

/**
 * Builds the IAM policy name prefix for GitHub OIDC placeholder policies.
 */
export function githubPolicyName(
  environment: NovaSafeEnvironment,
  purpose: string,
): string {
  return `${PROJECT_PREFIX}-${environment.shortName}-github-${purpose}`;
}

/**
 * Returns the canonical GitHub OIDC provider host (without scheme).
 */
export function githubOidcProviderHost(): string {
  return GITHUB_OIDC_PROVIDER_URL.replace('https://', '');
}

/**
 * Builds `sub` claim patterns for the GitHub OIDC trust policy.
 *
 * Restricts assumption to:
 * - specific repository placeholders under the organization
 * - specific branch refs and GitHub Environment names
 */
export function buildOidcSubjectPatterns(
  config: GitHubOidcSubjectConfig,
): string[] {
  const patterns: string[] = [];

  for (const repository of config.repositories) {
    for (const branch of config.branches) {
      patterns.push(
        `repo:${config.organization}/${repository.placeholder}:ref:refs/heads/${branch}`,
      );
    }

    for (const deploymentEnvironment of config.deploymentEnvironments) {
      patterns.push(
        `repo:${config.organization}/${repository.placeholder}:environment:${deploymentEnvironment}`,
      );
    }
  }

  return patterns;
}

/**
 * Builds IAM condition operators for the GitHub OIDC trust relationship.
 */
export function buildGitHubOidcTrustConditions(
  config: GitHubOidcSubjectConfig,
): Record<string, Record<string, string | string[]>> {
  return {
    StringEquals: {
      'token.actions.githubusercontent.com:aud': GITHUB_OIDC_AUDIENCE,
    },
    StringLike: {
      'token.actions.githubusercontent.com:sub': buildOidcSubjectPatterns(config),
    },
  };
}

/**
 * Placeholder S3 bucket ARN used in future deployment inline policies.
 * @todo Replace with real bucket ARNs when S3 stacks are implemented.
 */
export function placeholderS3BucketArn(
  environment: NovaSafeEnvironment,
  purpose: string,
): string {
  return `arn:aws:s3:::${PROJECT_PREFIX}-${environment.shortName}-TODO-${purpose}`;
}

/**
 * Placeholder Lambda function ARN used in future deployment inline policies.
 * @todo Replace with real function ARNs when Lambda stacks are implemented.
 */
export function placeholderLambdaArn(
  environment: NovaSafeEnvironment,
  purpose: string,
): string {
  return `arn:aws:lambda:${environment.awsRegion}:TODO_ACCOUNT:function:${PROJECT_PREFIX}-${environment.shortName}-TODO-${purpose}`;
}

/**
 * Placeholder CloudFront distribution ARN used in future invalidation policies.
 * @todo Replace with real distribution ARNs when CDN stacks are implemented.
 */
export function placeholderCloudFrontDistributionArn(
  environment: NovaSafeEnvironment,
): string {
  return `arn:aws:cloudfront::TODO_ACCOUNT:distribution/TODO-${environment.shortName}-distribution`;
}

/**
 * Placeholder API Gateway execution ARN used in future deployment policies.
 * @todo Replace with real API ARNs when API Gateway stacks are implemented.
 */
export function placeholderApiGatewayArn(
  environment: NovaSafeEnvironment,
  apiName: string,
): string {
  return `arn:aws:execute-api:${environment.awsRegion}:TODO_ACCOUNT:TODO-${environment.shortName}-${apiName}/*`;
}
