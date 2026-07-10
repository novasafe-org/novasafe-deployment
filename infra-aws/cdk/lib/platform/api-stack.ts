import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { ExpressLambdaHttpApi } from '../shared/lambda-api';
import type { NovaSafeStackProps } from '../shared/types';
import { mergeNovaSafeStackProps } from '../shared/types';

/**
 * Mobile API stack — **mobile-api.novasafe.io** (API Gateway HTTP API + Lambda).
 *
 * Application code from `novasafe-backend` (`services/core`) is deployed separately.
 * Configuration is bundled as `.env` in the Lambda zip (same keys as VPS `mobile-api/.env`).
 */
export class ApiStack extends cdk.Stack {
  public readonly api: ExpressLambdaHttpApi;

  public constructor(scope: Construct, id: string, props: NovaSafeStackProps) {
    super(scope, id, mergeNovaSafeStackProps(props, 'mobile-api'));

    this.api = new ExpressLambdaHttpApi(this, 'MobileApi', {
      environment: props.environment,
      serviceName: 'mobile-api',
      domainName: props.domains.mobileApi,
      environmentVariables: {
        LOG_ENABLE_FILE: 'false',
        LOG_ENABLE_CONSOLE: 'true',
      },
    });

    new cdk.CfnOutput(this, 'MobileApiFunctionName', {
      value: this.api.function.functionName,
      description: 'Lambda function name for mobile-api CI deploy',
      exportName: `${id}-function-name`,
    });

    new cdk.CfnOutput(this, 'MobileApiDomainTarget', {
      value: this.api.apiDomain.regionalDomainName,
      description: 'Cloudflare CNAME target for mobile-api.novasafe.io',
      exportName: `${id}-domain-target`,
    });

    new cdk.CfnOutput(this, 'MobileApiCertificateArn', {
      value: this.api.certificate.certificateArn,
      description: 'ACM certificate ARN for mobile-api.novasafe.io',
      exportName: `${id}-certificate-arn`,
    });
  }
}
