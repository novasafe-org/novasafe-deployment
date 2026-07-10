import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';
import { ExpressLambdaHttpApi } from '../shared/lambda-api';
import { bucketName } from '../shared/naming';
import type { NovaSafeStackProps } from '../shared/types';
import { mergeNovaSafeStackProps } from '../shared/types';

/**
 * Admin API stack — **admin-api.novasafe.io** (API Gateway HTTP API + Lambda).
 *
 * Blog media uploads use S3 instead of a local volume. Set `MEDIA_STORAGE_PATH=s3`
 * and `MEDIA_S3_BUCKET` in the bundled `.env` (see lambda overrides template).
 */
export class AdminApiStack extends cdk.Stack {
  public readonly api: ExpressLambdaHttpApi;
  public readonly uploadsBucket: s3.Bucket;

  public constructor(scope: Construct, id: string, props: NovaSafeStackProps) {
    super(scope, id, mergeNovaSafeStackProps(props, 'admin-api'));

    const isProduction = props.environment.name === 'production';
    const removalPolicy = isProduction
      ? cdk.RemovalPolicy.RETAIN
      : cdk.RemovalPolicy.DESTROY;
    const accountSuffix = cdk.Stack.of(this).account;

    this.uploadsBucket = new s3.Bucket(this, 'UploadsBucket', {
      bucketName: `${bucketName(props.environment, 'admin-uploads')}-${accountSuffix}`,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      enforceSSL: true,
      encryption: s3.BucketEncryption.S3_MANAGED,
      removalPolicy,
      autoDeleteObjects: !isProduction,
    });

    this.api = new ExpressLambdaHttpApi(this, 'AdminApi', {
      environment: props.environment,
      serviceName: 'admin-api',
      domainName: props.domains.adminApi,
      environmentVariables: {
        LOG_ENABLE_FILE: 'false',
        LOG_ENABLE_CONSOLE: 'true',
        MEDIA_S3_BUCKET: this.uploadsBucket.bucketName,
      },
    });

    this.uploadsBucket.grantReadWrite(this.api.function);

    new cdk.CfnOutput(this, 'AdminApiFunctionName', {
      value: this.api.function.functionName,
      description: 'Lambda function name for admin-api CI deploy',
      exportName: `${id}-function-name`,
    });

    new cdk.CfnOutput(this, 'AdminApiDomainTarget', {
      value: this.api.apiDomain.regionalDomainName,
      description: 'Cloudflare CNAME target for admin-api.novasafe.io',
      exportName: `${id}-domain-target`,
    });

    new cdk.CfnOutput(this, 'AdminApiUploadsBucket', {
      value: this.uploadsBucket.bucketName,
      description: 'S3 bucket for admin blog media uploads',
      exportName: `${id}-uploads-bucket`,
    });

    new cdk.CfnOutput(this, 'AdminApiCertificateArn', {
      value: this.api.certificate.certificateArn,
      description: 'ACM certificate ARN for admin-api.novasafe.io',
      exportName: `${id}-certificate-arn`,
    });
  }
}
