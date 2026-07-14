import * as cdk from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { AuthStack } from '../lib/platform/auth-stack';
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

describe('AuthStack', () => {
  it('provisions SSR Lambda hosting for start.novasafe.io', () => {
    const app = new cdk.App();
    const environment = getEnvironment('development');

    const stack = new AuthStack(app, 'test-auth', {
      environment,
      domains: getDomainsForEnvironment(environment),
      env: toCdkEnvironment(environment),
    });

    const template = Template.fromStack(stack);
    const certificateTemplate = findCertificateTemplate(app);

    template.resourceCountIs('AWS::ECR::Repository', 0);
    template.hasResourceProperties('AWS::Lambda::Function', {
      FunctionName: 'novasafe-dev-fn-auth',
      Handler: 'dist/runtimes/lambda.handler',
    });
    template.resourceCountIs('AWS::S3::Bucket', 2);
    template.resourceCountIs('AWS::CloudFront::Distribution', 1);
    certificateTemplate.resourceCountIs('AWS::CertificateManager::Certificate', 1);

    template.hasResourceProperties('AWS::CloudFront::Distribution', {
      DistributionConfig: Match.objectLike({
        Aliases: Match.arrayWith(['dev.start.novasafe.io']),
      }),
    });
  });
});
