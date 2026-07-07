import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { getGitHubOidcConfig } from '../config/github';
import { GitHubOidcStack } from '../lib/security/github-oidc-stack';
import { getDomainsForEnvironment } from '../lib/shared/domains';
import {
  getEnvironment,
  toCdkEnvironment,
} from '../lib/shared/environments';

describe('GitHubOidcStack', () => {
  it('creates OIDC provider, deploy role, and placeholder inline policies only', () => {
    const app = new cdk.App();
    const environment = getEnvironment('development');

    const stack = new GitHubOidcStack(app, 'test-github-oidc', {
      environment,
      domains: getDomainsForEnvironment(environment),
      env: toCdkEnvironment(environment),
      github: getGitHubOidcConfig('development'),
    });

    const template = Template.fromStack(stack);

    template.resourceCountIs('Custom::AWSCDKOpenIdConnectProvider', 1);
    template.resourceCountIs('AWS::IAM::Policy', 4);

    template.hasResourceProperties('AWS::IAM::Role', {
      RoleName: 'novasafe-dev-github-deploy',
    });

    template.hasResourceProperties('AWS::IAM::Policy', {
      PolicyName: 'novasafe-dev-github-future-s3',
    });

    const templateJson = JSON.stringify(template.toJSON());
    expect(templateJson).not.toContain('AdministratorAccess');
  });
});
