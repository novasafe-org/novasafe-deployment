import type { EnvironmentName } from '../lib/shared/environments';

/**
 * Logical application key for a GitHub repository placeholder.
 * Maps to a future NovaSafe application repo without hardcoding production names.
 */
export type GitHubRepositoryKey =
  | 'landing'
  | 'auth'
  | 'app'
  | 'backend'
  | 'deployment';

/**
 * Placeholder repository reference — replace `placeholder` with the real repo
 * name before enabling deployments.
 */
export interface GitHubRepositoryPlaceholder {
  readonly key: GitHubRepositoryKey;
  /** Repository name segment only (not `org/repo`). */
  readonly placeholder: string;
  readonly description: string;
}

/**
 * Reusable workflow identifiers that may assume the deploy role (future).
 */
export type GitHubWorkflowKey =
  | 'build-frontend'
  | 'build-backend'
  | 'deploy-frontend-aws'
  | 'deploy-backend-aws';

export interface GitHubWorkflowDefinition {
  readonly key: GitHubWorkflowKey;
  readonly reusableWorkflow: string;
  readonly description: string;
}

/**
 * Typed GitHub OIDC configuration for a NovaSafe AWS environment.
 */
export interface GitHubOidcEnvironmentConfig {
  readonly organization: string;
  readonly repositories: readonly GitHubRepositoryPlaceholder[];
  readonly branches: readonly string[];
  readonly deploymentEnvironments: readonly string[];
  readonly workflows: readonly GitHubWorkflowDefinition[];
}

const repositoryPlaceholders: readonly GitHubRepositoryPlaceholder[] = [
  {
    key: 'landing',
    placeholder: 'TODO-landing-repository',
    description: 'Marketing / landing frontend',
  },
  {
    key: 'auth',
    placeholder: 'TODO-auth-repository',
    description: 'Authentication service',
  },
  {
    key: 'app',
    placeholder: 'TODO-app-repository',
    description: 'Authenticated web application',
  },
  {
    key: 'backend',
    placeholder: 'TODO-backend-repository',
    description: 'Mobile and admin APIs',
  },
  {
    key: 'deployment',
    placeholder: 'TODO-deployment-repository',
    description: 'Infrastructure and reusable workflows (this repo)',
  },
];

const workflowDefinitions: readonly GitHubWorkflowDefinition[] = [
  {
    key: 'build-frontend',
    reusableWorkflow: 'build-frontend.yml',
    description: 'Build static frontend artifacts',
  },
  {
    key: 'build-backend',
    reusableWorkflow: 'build-backend.yml',
    description: 'Build backend / Lambda artifacts',
  },
  {
    key: 'deploy-frontend-aws',
    reusableWorkflow: 'deploy-frontend-aws.yml',
    description: 'Deploy frontend to S3 and invalidate CloudFront',
  },
  {
    key: 'deploy-backend-aws',
    reusableWorkflow: 'deploy-backend-aws.yml',
    description: 'Deploy backend to Lambda',
  },
];

const branchPlaceholders: readonly string[] = [
  'TODO-default-branch',
  'TODO-release-branch',
];

const githubDeploymentEnvironments: readonly string[] = [
  'development',
  'staging',
  'production',
];

/**
 * Returns GitHub OIDC configuration for the given NovaSafe environment.
 * Repository names remain placeholders until application repos are wired.
 */
export function getGitHubOidcConfig(
  _environment: EnvironmentName,
): GitHubOidcEnvironmentConfig {
  return {
    organization: 'novasafe-org',
    repositories: repositoryPlaceholders,
    branches: branchPlaceholders,
    deploymentEnvironments: githubDeploymentEnvironments,
    workflows: workflowDefinitions,
  };
}
