import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import type { NovaSafeStackProps } from '../shared/types';
import { mergeNovaSafeStackProps } from '../shared/types';

/**
 * Monitoring stack — observability infrastructure.
 *
 * Future responsibility: CloudWatch log groups, dashboards, alarms, and
 * tracing for serverless workloads.
 *
 * Intentionally creates **zero** AWS resources.
 */
export class MonitoringStack extends cdk.Stack {
  public constructor(scope: Construct, id: string, props: NovaSafeStackProps) {
    super(scope, id, mergeNovaSafeStackProps(props, 'observability'));

    cdk.Annotations.of(this).addInfo(
      'Observability placeholder — no resources provisioned.',
    );
  }
}
