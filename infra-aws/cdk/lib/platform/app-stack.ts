import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { StaticWebsite } from '../shared/static-site';
import type { NovaSafeStackProps } from '../shared/types';
import { mergeNovaSafeStackProps } from '../shared/types';

/**
 * App stack — static hosting for **app.novasafe.io**.
 *
 * Application code from `novasafe-app-v2` is deployed separately via CI/CD.
 */
export class AppStack extends cdk.Stack {
  public readonly website: StaticWebsite;

  public constructor(scope: Construct, id: string, props: NovaSafeStackProps) {
    super(scope, id, {
      ...mergeNovaSafeStackProps(props, 'app'),
      crossRegionReferences: true,
    });

    this.website = new StaticWebsite(this, 'Website', {
      environment: props.environment,
      siteName: 'app',
      primaryDomain: props.domains.app,
      includeWwwAlias: false,
    });

    new cdk.CfnOutput(this, 'AppBucketName', {
      value: this.website.contentBucket.bucketName,
      description: 'Private S3 bucket for app site content',
      exportName: `${id}-app-bucket-name`,
    });

    new cdk.CfnOutput(this, 'AppDistributionId', {
      value: this.website.distribution.distributionId,
      description: 'CloudFront distribution ID for cache invalidation',
      exportName: `${id}-app-distribution-id`,
    });

    new cdk.CfnOutput(this, 'AppDistributionDomainName', {
      value: this.website.distribution.distributionDomainName,
      description: 'CloudFront domain — configure as Cloudflare origin/CNAME target',
      exportName: `${id}-app-distribution-domain`,
    });

    new cdk.CfnOutput(this, 'AppCertificateArn', {
      value: this.website.certificate.certificateArn,
      description: 'ACM certificate ARN (us-east-1)',
      exportName: `${id}-app-certificate-arn`,
    });

    cdk.Annotations.of(this).addInfo(
      `App infrastructure for ${props.domains.app}. ` +
        'Add ACM DNS validation records in Cloudflare, then point DNS to CloudFront.',
    );
  }
}
