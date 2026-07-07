import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';

/**
 * Monitoring stack — placeholder.
 *
 * Future responsibility: observability (log groups, dashboards,
 * alarms, tracing) for serverless workloads.
 *
 * Intentionally creates zero AWS resources.
 */
export class MonitoringStack extends cdk.Stack {
  public constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    // TODO: add observability resources
  }
}
