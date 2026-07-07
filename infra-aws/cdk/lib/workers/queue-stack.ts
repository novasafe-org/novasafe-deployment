import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import type { NovaSafeStackProps } from '../shared/types';
import { mergeNovaSafeStackProps } from '../shared/types';

/**
 * Queue stack — background processing infrastructure.
 *
 * Future responsibility: async workers (SQS, EventBridge, scheduled jobs)
 * decoupled from request/response API Lambdas.
 *
 * Intentionally creates **zero** AWS resources.
 */
export class QueueStack extends cdk.Stack {
  public constructor(scope: Construct, id: string, props: NovaSafeStackProps) {
    super(scope, id, mergeNovaSafeStackProps(props, 'workers'));

    cdk.Annotations.of(this).addInfo(
      'Workers placeholder — no resources provisioned.',
    );
  }
}
