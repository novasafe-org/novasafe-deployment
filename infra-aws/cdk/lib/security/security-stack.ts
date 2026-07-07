import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import type { NovaSafeStackProps } from '../shared/types';
import { mergeNovaSafeStackProps } from '../shared/types';

/**
 * Security stack — shared security primitives.
 *
 * Future responsibility: IAM baselines, secrets references, and encryption
 * keys consumed by platform and worker stacks.
 *
 * Intentionally creates **zero** AWS resources.
 */
export class SecurityStack extends cdk.Stack {
  public constructor(scope: Construct, id: string, props: NovaSafeStackProps) {
    super(scope, id, mergeNovaSafeStackProps(props, 'security'));

    cdk.Annotations.of(this).addInfo(
      'Security placeholder — no resources provisioned.',
    );
  }
}
