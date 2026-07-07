import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import type { GitHubOidcEnvironmentConfig } from '../../config/github';
import {
  GITHUB_OIDC_AUDIENCE,
  GITHUB_OIDC_PROVIDER_URL,
  buildGitHubOidcTrustConditions,
  githubDeployRoleName,
  githubPolicyName,
  placeholderApiGatewayArn,
  placeholderCloudFrontDistributionArn,
  placeholderLambdaArn,
  placeholderS3BucketArn,
} from '../shared/github';
import type { NovaSafeStackProps } from '../shared/types';
import { mergeNovaSafeStackProps } from '../shared/types';

/**
 * Props for {@link GitHubOidcStack}.
 */
export interface GitHubOidcStackProps extends NovaSafeStackProps {
  readonly github: GitHubOidcEnvironmentConfig;
}

/**
 * GitHub OIDC authentication foundation for NovaSafe CI/CD.
 *
 * Creates:
 * - GitHub OIDC identity provider (`token.actions.githubusercontent.com`)
 * - GitHub Actions deploy IAM role with repository-scoped trust
 * - Placeholder inline policies for future S3, Lambda, CloudFront, and API Gateway
 *
 * Does **not** create application infrastructure (buckets, functions, distributions, APIs).
 * Does **not** attach `AdministratorAccess`.
 */
export class GitHubOidcStack extends cdk.Stack {
  /** GitHub OIDC provider. */
  public readonly oidcProvider: iam.OpenIdConnectProvider;
  /** IAM role assumed by GitHub Actions via OIDC. */
  public readonly deployRole: iam.Role;

  public constructor(scope: Construct, id: string, props: GitHubOidcStackProps) {
    super(scope, id, mergeNovaSafeStackProps(props, 'github-oidc'));

    const { environment, github } = props;

    this.oidcProvider = new iam.OpenIdConnectProvider(this, 'GitHubOidcProvider', {
      url: GITHUB_OIDC_PROVIDER_URL,
      clientIds: [GITHUB_OIDC_AUDIENCE],
    });

    const trustConditions = buildGitHubOidcTrustConditions({
      organization: github.organization,
      repositories: github.repositories,
      branches: github.branches,
      deploymentEnvironments: github.deploymentEnvironments,
    });

    this.deployRole = new iam.Role(this, 'GitHubActionsDeployRole', {
      roleName: githubDeployRoleName(environment),
      description:
        `GitHub Actions deploy role for NovaSafe (${environment.name}). ` +
        'Placeholder inline policies only — tighten before production cutover.',
      assumedBy: new iam.WebIdentityPrincipal(
        this.oidcProvider.openIdConnectProviderArn,
        trustConditions,
      ),
      maxSessionDuration: cdk.Duration.hours(1),
    });

    this.attachFutureS3Policy(environment);
    this.attachFutureLambdaPolicy(environment);
    this.attachFutureCloudFrontPolicy(environment);
    this.attachFutureApiGatewayPolicy(environment);

    new cdk.CfnOutput(this, 'GitHubOidcProviderArn', {
      value: this.oidcProvider.openIdConnectProviderArn,
      description: 'GitHub OIDC provider ARN',
      exportName: `${id}-oidc-provider-arn`,
    });

    new cdk.CfnOutput(this, 'GitHubActionsDeployRoleArn', {
      value: this.deployRole.roleArn,
      description: 'IAM role ARN for GitHub Actions OIDC authentication',
      exportName: `${id}-deploy-role-arn`,
    });

    new cdk.CfnOutput(this, 'GitHubActionsDeployRoleName', {
      value: this.deployRole.roleName,
      description: 'IAM role name for GitHub Actions OIDC authentication',
    });

    cdk.Annotations.of(this).addInfo(
      `GitHub OIDC authentication foundation for ${environment.name}. ` +
        'Placeholder policies target TODO ARNs only.',
    );
  }

  /**
   * Future S3 deployment permissions (placeholder ARNs).
   *
   * Intended actions when buckets exist:
   * - s3:ListBucket — list objects before sync
   * - s3:GetObject — verify uploaded objects
   * - s3:PutObject — upload build artifacts
   * - s3:DeleteObject — mirror-delete during deploy
   */
  private attachFutureS3Policy(environment: GitHubOidcStackProps['environment']): void {
    const bucketArn = placeholderS3BucketArn(environment, 'frontend');

    this.deployRole.attachInlinePolicy(
      new iam.Policy(this, 'FutureS3DeploymentPolicy', {
        policyName: githubPolicyName(environment, 'future-s3'),
        statements: [
          new iam.PolicyStatement({
            sid: 'FutureS3Deployment',
            effect: iam.Effect.ALLOW,
            actions: [
              's3:ListBucket',
              's3:GetObject',
              's3:PutObject',
              's3:DeleteObject',
            ],
            resources: [bucketArn, `${bucketArn}/*`],
          }),
        ],
      }),
    );
  }

  /**
   * Future Lambda deployment permissions (placeholder ARNs).
   *
   * Intended actions when functions exist:
   * - lambda:UpdateFunctionCode — upload deployment package
   * - lambda:GetFunction — verify deployment state
   * - lambda:PublishVersion — optional versioned releases
   * - lambda:UpdateAlias — route traffic to new version
   */
  private attachFutureLambdaPolicy(environment: GitHubOidcStackProps['environment']): void {
    const functionArn = placeholderLambdaArn(environment, 'api');

    this.deployRole.attachInlinePolicy(
      new iam.Policy(this, 'FutureLambdaDeploymentPolicy', {
        policyName: githubPolicyName(environment, 'future-lambda'),
        statements: [
          new iam.PolicyStatement({
            sid: 'FutureLambdaDeployment',
            effect: iam.Effect.ALLOW,
            actions: [
              'lambda:UpdateFunctionCode',
              'lambda:GetFunction',
              'lambda:GetFunctionConfiguration',
              'lambda:PublishVersion',
              'lambda:UpdateAlias',
            ],
            resources: [functionArn, `${functionArn}:*`],
          }),
        ],
      }),
    );
  }

  /**
   * Future CloudFront invalidation permissions (placeholder ARN).
   *
   * Intended actions when distributions exist:
   * - cloudfront:CreateInvalidation — purge CDN cache after deploy
   * - cloudfront:GetInvalidation — poll invalidation status
   */
  private attachFutureCloudFrontPolicy(environment: GitHubOidcStackProps['environment']): void {
    const distributionArn = placeholderCloudFrontDistributionArn(environment);

    this.deployRole.attachInlinePolicy(
      new iam.Policy(this, 'FutureCloudFrontInvalidationPolicy', {
        policyName: githubPolicyName(environment, 'future-cloudfront'),
        statements: [
          new iam.PolicyStatement({
            sid: 'FutureCloudFrontInvalidation',
            effect: iam.Effect.ALLOW,
            actions: ['cloudfront:CreateInvalidation', 'cloudfront:GetInvalidation'],
            resources: [distributionArn],
          }),
        ],
      }),
    );
  }

  /**
   * Future API Gateway deployment permissions (placeholder ARN).
   *
   * Intended actions when HTTP APIs exist:
   * - apigateway:GET — read API configuration
   * - apigateway:PATCH — update routes/stages (REST)
   * - apigateway:POST — create deployments
   */
  private attachFutureApiGatewayPolicy(environment: GitHubOidcStackProps['environment']): void {
    const apiArn = placeholderApiGatewayArn(environment, 'mobile-api');

    this.deployRole.attachInlinePolicy(
      new iam.Policy(this, 'FutureApiGatewayDeploymentPolicy', {
        policyName: githubPolicyName(environment, 'future-apigateway'),
        statements: [
          new iam.PolicyStatement({
            sid: 'FutureApiGatewayDeployment',
            effect: iam.Effect.ALLOW,
            actions: ['apigateway:GET', 'apigateway:PATCH', 'apigateway:POST'],
            resources: [apiArn],
          }),
        ],
      }),
    );
  }
}
