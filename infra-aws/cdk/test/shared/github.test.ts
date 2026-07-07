import {
  GITHUB_OIDC_AUDIENCE,
  GITHUB_OIDC_PROVIDER_URL,
  buildGitHubOidcTrustConditions,
  buildOidcSubjectPatterns,
  githubDeployRoleName,
} from '../../lib/shared/github';
import { getGitHubOidcConfig } from '../../config/github';
import { getEnvironment } from '../../lib/shared/environments';

describe('github shared helpers', () => {
  const environment = getEnvironment('development');
  const github = getGitHubOidcConfig('development');

  it('exposes GitHub OIDC constants', () => {
    expect(GITHUB_OIDC_PROVIDER_URL).toBe('https://token.actions.githubusercontent.com');
    expect(GITHUB_OIDC_AUDIENCE).toBe('sts.amazonaws.com');
  });

  it('builds repository-scoped subject patterns from placeholders', () => {
    const patterns = buildOidcSubjectPatterns({
      organization: github.organization,
      repositories: github.repositories,
      branches: github.branches,
      deploymentEnvironments: github.deploymentEnvironments,
    });

    expect(patterns).toContain(
      'repo:novasafe-org/TODO-landing-repository:ref:refs/heads/TODO-default-branch',
    );
    expect(patterns).toContain(
      'repo:novasafe-org/TODO-backend-repository:environment:staging',
    );
    expect(patterns.some((pattern) => pattern.includes('novasafe-landing-v2'))).toBe(false);
  });

  it('builds trust conditions for IAM WebIdentityPrincipal', () => {
    const conditions = buildGitHubOidcTrustConditions({
      organization: github.organization,
      repositories: github.repositories,
      branches: github.branches,
      deploymentEnvironments: github.deploymentEnvironments,
    });

    expect(conditions.StringEquals?.['token.actions.githubusercontent.com:aud']).toBe(
      'sts.amazonaws.com',
    );
    expect(Array.isArray(conditions.StringLike?.['token.actions.githubusercontent.com:sub'])).toBe(
      true,
    );
  });

  it('names the deploy role per environment', () => {
    expect(githubDeployRoleName(environment)).toBe('novasafe-dev-github-deploy');
  });
});
