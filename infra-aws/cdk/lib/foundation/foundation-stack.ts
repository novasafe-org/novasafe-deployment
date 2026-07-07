import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';

/**
 * Foundation stack — placeholder.
 *
 * Future responsibility: account-level baselines shared by other stacks
 * (e.g. CDK bootstrap references, shared parameters, optional networking).
 *
 * Intentionally creates zero AWS resources.
 */
export class FoundationStack extends cdk.Stack {
  public constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    // TODO: add foundation resources in a future implementation task
  }
}
