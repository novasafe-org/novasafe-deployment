import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';

/**
 * Queue stack — placeholder.
 *
 * Future responsibility: background processing (queues, event buses,
 * scheduled jobs) for async work decoupled from API Lambdas.
 *
 * Intentionally creates zero AWS resources.
 */
export class QueueStack extends cdk.Stack {
  public constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    // TODO: add worker / queue resources
  }
}
