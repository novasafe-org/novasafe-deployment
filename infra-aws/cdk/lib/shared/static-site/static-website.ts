import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as cdk from 'aws-cdk-lib';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import type { ICertificate } from 'aws-cdk-lib/aws-certificatemanager';
import { Construct } from 'constructs';
import type { NovaSafeEnvironment } from '../environments';
import { bucketName, physicalName } from '../naming';
import { SiteCertificateStack } from './certificate-stack';
import { StaticSiteCloudFrontPolicies } from './cloudfront-policies';
import { resolveStaticSiteDomainNames, type StaticSiteDomainNames } from './domain-names';

export interface StaticWebsiteProps {
  readonly environment: NovaSafeEnvironment;
  /** Logical site identifier used in resource names (e.g. landing, app). */
  readonly siteName: string;
  /** Primary hostname served by CloudFront (from domains config). */
  readonly primaryDomain: string;
  /** Include `www.` alias — defaults to true for production only. */
  readonly includeWwwAlias?: boolean;
}

/**
 * Reusable static website infrastructure: private S3, OAC, CloudFront, ACM, policies.
 *
 * Pattern: S3 (private) → Origin Access Control → CloudFront → viewers (Cloudflare DNS).
 */
export class StaticWebsite extends Construct {
  public readonly domainNames: StaticSiteDomainNames;
  public readonly contentBucket: s3.Bucket;
  public readonly accessLogBucket: s3.Bucket;
  public readonly originAccessControl: cloudfront.S3OriginAccessControl;
  public readonly distribution: cloudfront.Distribution;
  public readonly certificate: ICertificate;
  public readonly cloudWatchLogGroup: logs.LogGroup;
  public readonly policies: StaticSiteCloudFrontPolicies;

  public constructor(scope: Construct, id: string, props: StaticWebsiteProps) {
    super(scope, id);

    const { environment, siteName, primaryDomain } = props;
    const isDevelopment = environment.name === 'development';
    const isProduction = environment.name === 'production';
    const removalPolicy = isProduction
      ? cdk.RemovalPolicy.RETAIN
      : cdk.RemovalPolicy.DESTROY;

    const domainOptions =
      props.includeWwwAlias === undefined
        ? {}
        : { includeWww: props.includeWwwAlias };

    this.domainNames = resolveStaticSiteDomainNames(
      primaryDomain,
      environment,
      domainOptions,
    );

    const accountSuffix = cdk.Stack.of(this).account;

    this.contentBucket = new s3.Bucket(this, 'ContentBucket', {
      bucketName: `${bucketName(environment, siteName)}-${accountSuffix}`,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      enforceSSL: true,
      versioned: true,
      encryption: s3.BucketEncryption.S3_MANAGED,
      removalPolicy,
      autoDeleteObjects: isDevelopment,
    });

    this.accessLogBucket = new s3.Bucket(this, 'AccessLogBucket', {
      bucketName: `${bucketName(environment, `cf-logs-${siteName}`)}-${accountSuffix}`,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      enforceSSL: true,
      encryption: s3.BucketEncryption.S3_MANAGED,
      objectOwnership: s3.ObjectOwnership.BUCKET_OWNER_PREFERRED,
      removalPolicy,
      autoDeleteObjects: isDevelopment,
      lifecycleRules: [
        {
          id: 'expire-cloudfront-logs',
          enabled: true,
          expiration: cdk.Duration.days(90),
        },
      ],
    });

    this.cloudWatchLogGroup = new logs.LogGroup(this, 'CloudWatchLogGroup', {
      logGroupName: `/aws/novasafe/${environment.shortName}/cloudfront/${siteName}`,
      retention: logs.RetentionDays.ONE_MONTH,
      removalPolicy,
    });

    const certificateStack = new SiteCertificateStack(this, 'Certificate', {
      primaryDomain: this.domainNames.primary,
      subjectAlternativeNames: [...this.domainNames.aliases],
    });
    this.certificate = certificateStack.certificate;

    this.originAccessControl = new cloudfront.S3OriginAccessControl(this, 'OriginAccessControl', {
      originAccessControlName: physicalName(environment, `${siteName}-oac`),
      description: `OAC for ${siteName} S3 origin (${environment.name})`,
      signing: cloudfront.Signing.SIGV4_ALWAYS,
    });

    const s3Origin = origins.S3BucketOrigin.withOriginAccessControl(
      this.contentBucket as s3.IBucket,
      {
        originAccessControl: this.originAccessControl,
      },
    );

    this.policies = new StaticSiteCloudFrontPolicies(this, 'Policies', {
      environment,
      siteName,
      primaryDomain,
    });

    const defaultBehavior: cloudfront.BehaviorOptions = {
      origin: s3Origin,
      viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
      cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD_OPTIONS,
      compress: true,
      cachePolicy: this.policies.htmlCachePolicy,
      originRequestPolicy: this.policies.originRequestPolicy,
      responseHeadersPolicy: this.policies.responseHeadersPolicy,
    };

    this.distribution = new cloudfront.Distribution(this, 'Distribution', {
      comment: `NovaSafe ${siteName} (${environment.name})`,
      defaultRootObject: 'index.html',
      domainNames: [...this.domainNames.all],
      certificate: this.certificate,
      minimumProtocolVersion: cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021,
      httpVersion: cloudfront.HttpVersion.HTTP2_AND_3,
      priceClass: cloudfront.PriceClass.PRICE_CLASS_100,
      enableIpv6: true,
      defaultBehavior,
      additionalBehaviors: {
        '/assets/*': {
          ...defaultBehavior,
          cachePolicy: this.policies.assetsCachePolicy,
        },
      },
      errorResponses: [
        {
          httpStatus: 403,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: cdk.Duration.seconds(0),
        },
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: cdk.Duration.seconds(0),
        },
      ],
      logBucket: this.accessLogBucket as s3.IBucket,
      logFilePrefix: `${siteName}/`,
      logIncludesCookies: false,
    });

    cdk.Annotations.of(this).addInfo(
      `Static website ${siteName} uses Origin Access Control (OAC), not legacy OAI.`,
    );
  }
}
