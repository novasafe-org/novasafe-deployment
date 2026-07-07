import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';

/**
 * Security stack — placeholder.
 *
 * Future responsibility: shared security primitives (IAM baselines,
 * secrets references, KMS keys) consumed by platform and worker stacks.
 *
 * Intentionally creates zero AWS resources.
 */
export class SecurityStack extends cdk.Stack {
  public constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    // TODO: add security resources
  }
}
