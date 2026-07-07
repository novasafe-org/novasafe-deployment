import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';

/**
 * Auth stack — placeholder.
 *
 * Future responsibility: authentication service (novasafe-auth-v2)
 * behind API Gateway + Lambda.
 *
 * Intentionally creates zero AWS resources.
 */
export class AuthStack extends cdk.Stack {
  public constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    // TODO: add auth service resources
  }
}
