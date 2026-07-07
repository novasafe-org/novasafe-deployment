import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';

/**
 * Admin API stack — placeholder.
 *
 * Future responsibility: admin API at admin-api.novasafe.io
 * (API Gateway + Lambda, MongoDB Atlas connection).
 *
 * Intentionally creates zero AWS resources.
 */
export class AdminApiStack extends cdk.Stack {
  public constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    // TODO: add admin API resources
  }
}
