import * as cdk from 'aws-cdk-lib';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import { Construct } from 'constructs';
import type { NovaSafeEnvironment } from '../environments';
import { physicalName } from '../naming';

/** Extra CSP / header rules for sites that load third-party scripts at runtime. */
export type StaticSiteSecurityProfile = 'default' | 'google-sign-in';

function buildContentSecurityPolicy(profile: StaticSiteSecurityProfile): string {
  const scriptSrc =
    profile === 'google-sign-in'
      ? "script-src 'self' 'unsafe-inline' https://accounts.google.com"
      : "script-src 'self' 'unsafe-inline'";

  const connectSrc =
    profile === 'google-sign-in'
      ? "connect-src 'self' https://*.novasafe.io https://accounts.google.com https://oauth2.googleapis.com"
      : "connect-src 'self' https://*.novasafe.io";

  const directives = [
    "default-src 'self'",
    scriptSrc,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: https:",
    "font-src 'self' data: https://fonts.gstatic.com",
    connectSrc,
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ];

  if (profile === 'google-sign-in') {
    directives.push("frame-src 'self' https://accounts.google.com");
  }

  return directives.join('; ');
}

/**
 * CloudFront cache, origin request, and response header policies for React SPAs.
 *
 * Reused by Landing, App, and future static site stacks.
 */
export class StaticSiteCloudFrontPolicies extends Construct {
  /** Minimal caching for HTML shell and SPA routes. */
  public readonly htmlCachePolicy: cloudfront.CachePolicy;
  /** Aggressive caching for fingerprinted `/assets/*` bundles. */
  public readonly assetsCachePolicy: cloudfront.CachePolicy;
  /** S3 origin request policy (no cookies/query forwarding). */
  public readonly originRequestPolicy: cloudfront.OriginRequestPolicy;
  /** Security headers applied to all viewer responses. */
  public readonly responseHeadersPolicy: cloudfront.ResponseHeadersPolicy;

  public constructor(
    scope: Construct,
    id: string,
    props: {
      readonly environment: NovaSafeEnvironment;
      readonly siteName: string;
      readonly primaryDomain: string;
      readonly securityProfile?: StaticSiteSecurityProfile;
    },
  ) {
    super(scope, id);

    const prefix = physicalName(props.environment, props.siteName);
    const securityProfile = props.securityProfile ?? 'default';
    const contentSecurityPolicy = buildContentSecurityPolicy(securityProfile);
    const crossOriginOpenerPolicy =
      securityProfile === 'google-sign-in' ? 'same-origin-allow-popups' : 'same-origin';

    this.htmlCachePolicy = new cloudfront.CachePolicy(this, 'HtmlCachePolicy', {
      cachePolicyName: `${prefix}-html-cache`,
      comment: 'Minimal TTL for index.html; invalidate /index.html on deploy.',
      defaultTtl: cdk.Duration.seconds(0),
      minTtl: cdk.Duration.seconds(0),
      maxTtl: cdk.Duration.minutes(5),
      enableAcceptEncodingBrotli: true,
      enableAcceptEncodingGzip: true,
      headerBehavior: cloudfront.CacheHeaderBehavior.none(),
      queryStringBehavior: cloudfront.CacheQueryStringBehavior.none(),
      cookieBehavior: cloudfront.CacheCookieBehavior.none(),
    });

    this.assetsCachePolicy = new cloudfront.CachePolicy(this, 'AssetsCachePolicy', {
      cachePolicyName: `${prefix}-assets-cache`,
      comment: 'Long TTL for fingerprinted /assets/*; hashing busts cache.',
      defaultTtl: cdk.Duration.days(365),
      minTtl: cdk.Duration.days(1),
      maxTtl: cdk.Duration.days(365),
      enableAcceptEncodingBrotli: true,
      enableAcceptEncodingGzip: true,
      headerBehavior: cloudfront.CacheHeaderBehavior.none(),
      queryStringBehavior: cloudfront.CacheQueryStringBehavior.none(),
      cookieBehavior: cloudfront.CacheCookieBehavior.none(),
    });

    this.originRequestPolicy = new cloudfront.OriginRequestPolicy(this, 'OriginRequestPolicy', {
      originRequestPolicyName: `${prefix}-origin-request`,
      comment: 'Forward only the minimum required headers to the private S3 origin.',
      headerBehavior: cloudfront.OriginRequestHeaderBehavior.none(),
      queryStringBehavior: cloudfront.OriginRequestQueryStringBehavior.none(),
      cookieBehavior: cloudfront.OriginRequestCookieBehavior.none(),
    });

    this.responseHeadersPolicy = new cloudfront.ResponseHeadersPolicy(
      this,
      'ResponseHeadersPolicy',
      {
        responseHeadersPolicyName: `${prefix}-security-headers`,
        comment: `Security headers for ${props.primaryDomain}`,
        securityHeadersBehavior: {
          strictTransportSecurity: {
            accessControlMaxAge: cdk.Duration.days(365),
            includeSubdomains: true,
            preload: true,
            override: true,
          },
          contentTypeOptions: { override: true },
          frameOptions: {
            frameOption: cloudfront.HeadersFrameOption.DENY,
            override: true,
          },
          referrerPolicy: {
            referrerPolicy: cloudfront.HeadersReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN,
            override: true,
          },
          contentSecurityPolicy: {
            contentSecurityPolicy,
            override: true,
          },
          xssProtection: {
            protection: true,
            modeBlock: true,
            override: true,
          },
        },
        customHeadersBehavior: {
          customHeaders: [
            {
              header: 'Permissions-Policy',
              value: 'camera=(), microphone=(), geolocation=(), payment=()',
              override: true,
            },
            {
              header: 'Cross-Origin-Opener-Policy',
              value: crossOriginOpenerPolicy,
              override: true,
            },
            {
              header: 'Cross-Origin-Resource-Policy',
              value: 'same-origin',
              override: true,
            },
          ],
        },
      },
    );
  }
}
