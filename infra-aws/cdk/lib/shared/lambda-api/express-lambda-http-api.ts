import * as apigatewayv2 from 'aws-cdk-lib/aws-apigatewayv2';
import * as apigatewayv2Integrations from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as logs from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';
import type { NovaSafeEnvironment } from '../environments';
import { apiName, lambdaName } from '../naming';

export interface ExpressLambdaHttpApiProps {
  readonly environment: NovaSafeEnvironment;
  /** Resource suffix (e.g. mobile-api, admin-api). */
  readonly serviceName: string;
  /** Public hostname (e.g. mobile-api.novasafe.io). */
  readonly domainName: string;
  /** Lambda handler path inside the deployment package. */
  readonly handler?: string;
  /** Optional extra environment variables set by CDK (non-secret). */
  readonly environmentVariables?: Record<string, string>;
}

/**
 * HTTP API Gateway + Node.js Lambda for Express apps deployed via serverless-express.
 *
 * Application configuration (secrets, MongoDB, etc.) is supplied at deploy time by
 * bundling a `.env` file into the Lambda zip — same format as VPS Docker compose.
 */
export class ExpressLambdaHttpApi extends Construct {
  public readonly function: lambda.Function;
  public readonly httpApi: apigatewayv2.HttpApi;
  public readonly certificate: acm.Certificate;
  public readonly apiDomain: apigatewayv2.DomainName;

  public constructor(scope: Construct, id: string, props: ExpressLambdaHttpApiProps) {
    super(scope, id);

    const { environment, serviceName, domainName } = props;
    const isProduction = environment.name === 'production';
    const removalPolicy = isProduction
      ? cdk.RemovalPolicy.RETAIN
      : cdk.RemovalPolicy.DESTROY;

    const logGroup = new logs.LogGroup(this, 'LogGroup', {
      logGroupName: `/aws/lambda/${lambdaName(environment, serviceName)}`,
      retention: logs.RetentionDays.ONE_MONTH,
      removalPolicy,
    });

    this.function = new lambda.Function(this, 'Function', {
      functionName: lambdaName(environment, serviceName),
      description: `NovaSafe ${serviceName} (${environment.name})`,
      runtime: lambda.Runtime.NODEJS_20_X,
      architecture: lambda.Architecture.ARM_64,
      handler: props.handler ?? 'dist/runtimes/lambda.handler',
      code: lambda.Code.fromInline(`
exports.handler = async () => ({
  statusCode: 503,
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({
    success: false,
    message: 'Awaiting first CI deployment package',
    service: '${serviceName}',
  }),
});
`),
      memorySize: 512,
      timeout: cdk.Duration.seconds(29),
      environment: {
        NODE_ENV: 'production',
        AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
        ...props.environmentVariables,
      },
      logGroup,
    });

    this.httpApi = new apigatewayv2.HttpApi(this, 'HttpApi', {
      apiName: apiName(environment, serviceName),
      description: `HTTP API for ${domainName}`,
      createDefaultStage: true,
    });

    const integration = new apigatewayv2Integrations.HttpLambdaIntegration(
      'LambdaIntegration',
      this.function,
    );

    this.httpApi.addRoutes({
      path: '/{proxy+}',
      methods: [apigatewayv2.HttpMethod.ANY],
      integration,
    });

    this.httpApi.addRoutes({
      path: '/',
      methods: [apigatewayv2.HttpMethod.ANY],
      integration,
    });

    this.certificate = new acm.Certificate(this, 'Certificate', {
      domainName,
      validation: acm.CertificateValidation.fromDns(),
    });

    this.apiDomain = new apigatewayv2.DomainName(this, 'CustomDomain', {
      domainName,
      certificate: this.certificate,
    });

    new apigatewayv2.ApiMapping(this, 'ApiMapping', {
      api: this.httpApi,
      domainName: this.apiDomain,
      stage: this.httpApi.defaultStage!,
    });

    new cdk.CfnOutput(this, 'LambdaFunctionName', {
      value: this.function.functionName,
      description: 'Lambda function name for CI code deployment',
    });

    new cdk.CfnOutput(this, 'ApiGatewayUrl', {
      value: this.httpApi.apiEndpoint,
      description: 'Default API Gateway endpoint (before custom domain DNS)',
    });

    new cdk.CfnOutput(this, 'CustomDomainTarget', {
      value: this.apiDomain.regionalDomainName,
      description: 'API Gateway regional domain — Cloudflare CNAME target',
    });

    new cdk.CfnOutput(this, 'CustomDomainHostedZoneId', {
      value: this.apiDomain.regionalHostedZoneId,
      description: 'Route53 hosted zone ID for API Gateway regional domain (Cloudflare CNAME)',
    });

    new cdk.CfnOutput(this, 'CertificateArn', {
      value: this.certificate.certificateArn,
      description: 'ACM certificate ARN (regional, DNS validation in Cloudflare)',
    });

    cdk.Annotations.of(this).addInfo(
      `Add ACM DNS validation for ${domainName}, then CNAME ${domainName} → ${this.apiDomain.regionalDomainName}. ` +
        'Deploy application code via GitHub Actions; bundle the same `.env` file used on VPS.',
    );
  }
}
