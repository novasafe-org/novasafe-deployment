import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { StaticWebsite } from '../shared/static-site';
import type { NovaSafeStackProps } from '../shared/types';
import { mergeNovaSafeStackProps } from '../shared/types';

/**
 * Landing stack — production static site for **novasafe.io**.
 *
 * Provisions:
 * - Private versioned S3 bucket (SSE-S3, block public access)
 * - CloudFront distribution with **Origin Access Control (OAC)**
 * - ACM TLS certificate (us-east-1, DNS validation via Cloudflare)
 * - SPA cache / security header / origin request policies
 * - CloudFront access logging and CloudWatch log group
 *
 * Application code from `novasafe-landing-v2` is deployed separately via CI/CD.
 */
export class LandingStack extends cdk.Stack {
  public readonly website: StaticWebsite;

  public constructor(scope: Construct, id: string, props: NovaSafeStackProps) {
    super(scope, id, {
      ...mergeNovaSafeStackProps(props, 'landing'),
      crossRegionReferences: true,
    });

    this.website = new StaticWebsite(this, 'Website', {
      environment: props.environment,
      siteName: 'landing',
      primaryDomain: props.domains.landing,
    });

    new cdk.CfnOutput(this, 'BucketName', {
      value: this.website.contentBucket.bucketName,
      description: 'Private S3 bucket for landing site content',
      exportName: `${id}-bucket-name`,
    });

    new cdk.CfnOutput(this, 'DistributionId', {
      value: this.website.distribution.distributionId,
      description: 'CloudFront distribution ID for cache invalidation',
      exportName: `${id}-distribution-id`,
    });

    new cdk.CfnOutput(this, 'DistributionDomainName', {
      value: this.website.distribution.distributionDomainName,
      description: 'CloudFront domain — configure as Cloudflare origin/CNAME target',
      exportName: `${id}-distribution-domain`,
    });

    new cdk.CfnOutput(this, 'CertificateArn', {
      value: this.website.certificate.certificateArn,
      description: 'ACM certificate ARN (us-east-1)',
      exportName: `${id}-certificate-arn`,
    });

    new cdk.CfnOutput(this, 'OriginAccessControlId', {
      value: this.website.originAccessControl.originAccessControlId,
      description: 'CloudFront Origin Access Control ID (OAC — not legacy OAI)',
    });

    new cdk.CfnOutput(this, 'CloudWatchLogGroupName', {
      value: this.website.cloudWatchLogGroup.logGroupName,
      description: 'CloudWatch log group for landing CDN operational logs',
    });

    cdk.Annotations.of(this).addInfo(
      `Landing infrastructure for ${props.domains.landing}. ` +
        'Add ACM DNS validation records in Cloudflare, then point DNS to CloudFront.',
    );
  }
}
