import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import type { ICertificate } from 'aws-cdk-lib/aws-certificatemanager';
import { Construct } from 'constructs';
import * as path from 'path';
import type { NovaSafeEnvironment } from '../environments';
import { bucketName, lambdaName } from '../naming';
import { SiteCertificateStack } from '../static-site/certificate-stack';
import { StaticSiteCloudFrontPolicies } from '../static-site/cloudfront-policies';
import { resolveStaticSiteDomainNames, type StaticSiteDomainNames } from '../static-site/domain-names';

export interface SsrLambdaWebsiteProps {
  readonly environment: NovaSafeEnvironment;
  /** Logical site identifier (e.g. auth, app). */
  readonly siteName: string;
  /** Primary hostname served by CloudFront. */
  readonly primaryDomain: string;
  readonly includeWwwAlias?: boolean;
  /** Non-secret runtime env for the container (VITE_* URLs, etc.). */
  readonly environmentVariables?: Record<string, string>;
}

/**
 * TanStack Start / Node SSR on zip-based Lambda behind CloudFront.
 *
 * No ECR — application code is deployed via CI (`aws lambda update-function-code`).
 */
export class SsrLambdaWebsite extends Construct {
  public readonly domainNames: StaticSiteDomainNames;
  public readonly function: lambda.Function;
  public readonly distribution: cloudfront.Distribution;
  public readonly certificate: ICertificate;
  public readonly accessLogBucket: s3.Bucket;
  public readonly policies: StaticSiteCloudFrontPolicies;

  public constructor(scope: Construct, id: string, props: SsrLambdaWebsiteProps) {
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

    const certificateStack = new SiteCertificateStack(this, 'Certificate', {
      primaryDomain: this.domainNames.primary,
      subjectAlternativeNames: [...this.domainNames.aliases],
    });
    this.certificate = certificateStack.certificate;

    const placeholderDir = path.join(__dirname, `../../../lambda/${siteName}-ssr-placeholder`);

    this.function = new lambda.Function(this, 'Function', {
      functionName: lambdaName(environment, siteName),
      description: `NovaSafe ${siteName} SSR (${environment.name})`,
      runtime: lambda.Runtime.NODEJS_20_X,
      architecture: lambda.Architecture.ARM_64,
      handler: 'dist/runtimes/lambda.handler',
      code: lambda.Code.fromAsset(placeholderDir),
      memorySize: 1024,
      timeout: cdk.Duration.seconds(29),
      logRetention: logs.RetentionDays.ONE_MONTH,
      environment: {
        NODE_ENV: 'production',
        AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
        ...props.environmentVariables,
      },
    });

    const functionUrl = this.function.addFunctionUrl({
      authType: lambda.FunctionUrlAuthType.NONE,
    });

    const lambdaOrigin = new origins.FunctionUrlOrigin(functionUrl, {
      readTimeout: cdk.Duration.seconds(30),
    });

    this.policies = new StaticSiteCloudFrontPolicies(this, 'Policies', {
      environment,
      siteName,
      primaryDomain,
    });

    const ssrBehavior: cloudfront.BehaviorOptions = {
      origin: lambdaOrigin,
      viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
      cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD_OPTIONS,
      compress: true,
      cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
      originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
      responseHeadersPolicy: this.policies.responseHeadersPolicy,
    };

    this.distribution = new cloudfront.Distribution(this, 'Distribution', {
      comment: `NovaSafe ${siteName} SSR (${environment.name})`,
      domainNames: [...this.domainNames.all],
      certificate: this.certificate,
      minimumProtocolVersion: cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021,
      httpVersion: cloudfront.HttpVersion.HTTP2_AND_3,
      priceClass: cloudfront.PriceClass.PRICE_CLASS_100,
      enableIpv6: true,
      defaultBehavior: ssrBehavior,
      additionalBehaviors: {
        '/assets/*': {
          ...ssrBehavior,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
          cachePolicy: this.policies.assetsCachePolicy,
        },
      },
      logBucket: this.accessLogBucket as s3.IBucket,
      logFilePrefix: `${siteName}/`,
      logIncludesCookies: false,
    });

    cdk.Annotations.of(this).addInfo(
      `SSR site ${siteName}: deploy a zip package via app CI ` +
        '(`aws lambda update-function-code`), then invalidate CloudFront. No ECR.',
    );
  }
}
