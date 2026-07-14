import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { SsrLambdaWebsite } from '../shared/ssr-lambda-site';
import { ssrSessionEnvironmentVariables } from '../shared/ssr-session-env';
import type { NovaSafeStackProps } from '../shared/types';
import { mergeNovaSafeStackProps } from '../shared/types';

/**
 * App stack — **app.novasafe.io** (zip Lambda SSR + CloudFront).
 *
 * TanStack Start requires SSR and server functions; static S3-only hosting
 * cannot run the authenticated vault UI. Application zip is deployed via CI.
 */
export class AppStack extends cdk.Stack {
  public readonly website: SsrLambdaWebsite;

  public constructor(scope: Construct, id: string, props: NovaSafeStackProps) {
    super(scope, id, {
      ...mergeNovaSafeStackProps(props, 'app'),
      crossRegionReferences: true,
    });

    this.website = new SsrLambdaWebsite(this, 'Website', {
      environment: props.environment,
      siteName: 'app',
      primaryDomain: props.domains.app,
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

    new cdk.CfnOutput(this, 'AppBucketName', {
      value: this.website.contentBucket.bucketName,
      description: 'S3 bucket for /assets/* static files',
      exportName: `${id}-app-bucket-name`,
    });

    new cdk.CfnOutput(this, 'AppLambdaFunctionName', {
      value: this.website.function.functionName,
      description: 'Lambda function name for app SSR CI deploy',
      exportName: `${id}-app-function-name`,
    });

    new cdk.CfnOutput(this, 'AppDistributionId', {
      value: this.website.distribution.distributionId,
      description: 'CloudFront distribution ID',
      exportName: `${id}-app-distribution-id`,
    });

    new cdk.CfnOutput(this, 'AppDistributionDomainName', {
      value: this.website.distribution.distributionDomainName,
      description: 'CloudFront domain — Cloudflare CNAME target',
      exportName: `${id}-app-distribution-domain`,
    });

    new cdk.CfnOutput(this, 'AppCertificateArn', {
      value: this.website.certificate.certificateArn,
      description: 'ACM certificate ARN (us-east-1)',
      exportName: `${id}-app-certificate-arn`,
    });

    cdk.Annotations.of(this).addInfo(
      `App SSR for ${props.domains.app}. Deploy zip via GitHub Actions, invalidate CloudFront.`,
    );
  }
}
