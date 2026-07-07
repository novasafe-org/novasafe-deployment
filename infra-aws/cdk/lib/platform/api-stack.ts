import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';

/**
 * API stack — placeholder.
 *
 * Future responsibility: mobile API at mobile-api.novasafe.io
 * (API Gateway + Lambda, MongoDB Atlas connection).
 *
 * Intentionally creates zero AWS resources.
 */
export class ApiStack extends cdk.Stack {
  public constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    // TODO: add mobile API resources
  }
}
