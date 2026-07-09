import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { StaticWebsite } from '../shared/static-site';
import type { NovaSafeStackProps } from '../shared/types';
import { mergeNovaSafeStackProps } from '../shared/types';

/**
 * Auth stack — static hosting for **start.novasafe.io**.
 *
 * Application code from `novasafe-auth-v2` is deployed separately via CI/CD.
 */
export class AuthStack extends cdk.Stack {
  public readonly website: StaticWebsite;

  public constructor(scope: Construct, id: string, props: NovaSafeStackProps) {
    super(scope, id, {
      ...mergeNovaSafeStackProps(props, 'auth'),
      crossRegionReferences: true,
    });

    this.website = new StaticWebsite(this, 'Website', {
      environment: props.environment,
      siteName: 'auth',
      primaryDomain: props.domains.start,
      includeWwwAlias: false,
    });

    new cdk.CfnOutput(this, 'AuthBucketName', {
      value: this.website.contentBucket.bucketName,
      description: 'Private S3 bucket for auth site content',
      exportName: `${id}-auth-bucket-name`,
    });

    new cdk.CfnOutput(this, 'AuthDistributionId', {
      value: this.website.distribution.distributionId,
      description: 'CloudFront distribution ID for cache invalidation',
      exportName: `${id}-auth-distribution-id`,
    });

    new cdk.CfnOutput(this, 'AuthDistributionDomainName', {
      value: this.website.distribution.distributionDomainName,
      description: 'CloudFront domain — configure as Cloudflare origin/CNAME target',
      exportName: `${id}-auth-distribution-domain`,
    });

    new cdk.CfnOutput(this, 'AuthCertificateArn', {
      value: this.website.certificate.certificateArn,
      description: 'ACM certificate ARN (us-east-1)',
      exportName: `${id}-auth-certificate-arn`,
    });

    cdk.Annotations.of(this).addInfo(
      `Auth infrastructure for ${props.domains.start}. ` +
        'Add ACM DNS validation records in Cloudflare, then point DNS to CloudFront.',
    );
  }
}
