import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { SsrLambdaWebsite } from '../shared/ssr-lambda-site';
import { ssrSessionEnvironmentVariables } from '../shared/ssr-session-env';
import type { NovaSafeStackProps } from '../shared/types';
import { mergeNovaSafeStackProps } from '../shared/types';

/**
 * Auth stack — **start.novasafe.io** (zip Lambda SSR + CloudFront).
 *
 * TanStack Start requires SSR and server functions; static S3-only hosting
 * cannot run login/signup. Application zip is deployed via CI (no ECR).
 */
export class AuthStack extends cdk.Stack {
  public readonly website: SsrLambdaWebsite;

  public constructor(scope: Construct, id: string, props: NovaSafeStackProps) {
    super(scope, id, {
      ...mergeNovaSafeStackProps(props, 'auth'),
      crossRegionReferences: true,
    });

    this.website = new SsrLambdaWebsite(this, 'Website', {
      environment: props.environment,
      siteName: 'auth',
      primaryDomain: props.domains.start,
      includeWwwAlias: false,
      importContentBucket: props.environment.name === 'production',
      environmentVariables: {
        ...ssrSessionEnvironmentVariables(props.domains),
        VITE_AUTH_URL: `https://${props.domains.start}`,
        VITE_APP_URL: `https://${props.domains.app}`,
        VITE_LANDING_URL: `https://${props.domains.landing}`,
        VITE_API_URL: `https://${props.domains.mobileApi}`,
      },
    });

    new cdk.CfnOutput(this, 'AuthBucketName', {
      value: this.website.contentBucket.bucketName,
      description: 'S3 bucket for /assets/* static files',
      exportName: `${id}-auth-bucket-name`,
    });

    new cdk.CfnOutput(this, 'AuthLambdaFunctionName', {
      value: this.website.function.functionName,
      description: 'Lambda function name for auth SSR CI deploy',
      exportName: `${id}-auth-function-name`,
    });

    new cdk.CfnOutput(this, 'AuthDistributionId', {
      value: this.website.distribution.distributionId,
      description: 'CloudFront distribution ID',
      exportName: `${id}-auth-distribution-id`,
    });

    new cdk.CfnOutput(this, 'AuthDistributionDomainName', {
      value: this.website.distribution.distributionDomainName,
      description: 'CloudFront domain — Cloudflare CNAME target',
      exportName: `${id}-auth-distribution-domain`,
    });

    new cdk.CfnOutput(this, 'AuthCertificateArn', {
      value: this.website.certificate.certificateArn,
      description: 'ACM certificate ARN (us-east-1)',
      exportName: `${id}-auth-certificate-arn`,
    });

    cdk.Annotations.of(this).addInfo(
      `Auth SSR for ${props.domains.start}. Deploy zip via GitHub Actions, invalidate CloudFront.`,
    );
  }
}
