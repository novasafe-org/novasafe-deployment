import * as cdk from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { LandingStack } from '../lib/marketing/landing-stack';
import { getDomainsForEnvironment } from '../lib/shared/domains';
import {
  getEnvironment,
  toCdkEnvironment,
} from '../lib/shared/environments';

function findCertificateTemplate(app: cdk.App): Template {
  const assembly = app.synth();
  const certificateStack = assembly.stacks.find((stack) =>
    stack.stackName.includes('Certificate'),
  );

  if (!certificateStack) {
    throw new Error('Certificate stack not found in CDK assembly');
  }

  return Template.fromJSON(certificateStack.template);
}

describe('LandingStack', () => {
  it('provisions private S3, OAC, CloudFront, and policies for the landing site', () => {
    const app = new cdk.App();
    const environment = getEnvironment('development');

    const stack = new LandingStack(app, 'test-landing', {
      environment,
      domains: getDomainsForEnvironment(environment),
      env: toCdkEnvironment(environment),
    });

    const template = Template.fromStack(stack);
    const certificateTemplate = findCertificateTemplate(app);

    template.resourceCountIs('AWS::S3::Bucket', 2);
    template.resourceCountIs('AWS::CloudFront::OriginAccessControl', 1);
    template.resourceCountIs('AWS::CloudFront::Distribution', 1);
    template.resourceCountIs('AWS::CloudFront::CachePolicy', 2);
    template.resourceCountIs('AWS::CloudFront::OriginRequestPolicy', 1);
    template.resourceCountIs('AWS::CloudFront::ResponseHeadersPolicy', 1);
    template.resourceCountIs('AWS::Logs::LogGroup', 1);
    certificateTemplate.resourceCountIs('AWS::CertificateManager::Certificate', 1);

    template.hasResourceProperties('AWS::S3::Bucket', {
      PublicAccessBlockConfiguration: {
        BlockPublicAcls: true,
        BlockPublicPolicy: true,
        IgnorePublicAcls: true,
        RestrictPublicBuckets: true,
      },
      VersioningConfiguration: {
        Status: 'Enabled',
      },
      BucketEncryption: {
        ServerSideEncryptionConfiguration: [
          {
            ServerSideEncryptionByDefault: {
              SSEAlgorithm: 'AES256',
            },
          },
        ],
      },
    });

    template.hasResourceProperties('AWS::CloudFront::Distribution', {
      DistributionConfig: Match.objectLike({
        DefaultRootObject: 'index.html',
        HttpVersion: 'http2and3',
        IPV6Enabled: true,
        CustomErrorResponses: Match.arrayWith([
          Match.objectLike({
            ErrorCode: 403,
            ResponseCode: 200,
            ResponsePagePath: '/index.html',
          }),
          Match.objectLike({
            ErrorCode: 404,
            ResponseCode: 200,
            ResponsePagePath: '/index.html',
          }),
        ]),
      }),
    });

    template.resourceCountIs('AWS::CloudFront::CloudFrontOriginAccessIdentity', 0);

    template.hasOutput('LandingBucketName', {});
    template.hasOutput('LandingDistributionId', {});
    template.hasOutput('LandingDistributionDomainName', {});
    template.hasOutput('LandingCertificateArn', {});
  });

  it('includes www.novasafe.io for production certificate SANs', () => {
    const app = new cdk.App();
    const environment = getEnvironment('production');

    new LandingStack(app, 'test-landing-prod', {
      environment,
      domains: getDomainsForEnvironment(environment),
      env: toCdkEnvironment(environment),
    });

    const certificateTemplate = findCertificateTemplate(app);

    certificateTemplate.hasResourceProperties('AWS::CertificateManager::Certificate', {
      DomainName: 'novasafe.io',
      SubjectAlternativeNames: ['www.novasafe.io'],
    });
  });
});
