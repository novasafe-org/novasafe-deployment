import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import type { NovaSafeStackProps } from '../shared/types';
import { mergeNovaSafeStackProps } from '../shared/types';

/**
 * Auth stack — authentication service infrastructure.
 *
 * Future responsibility: **novasafe-auth-v2** behind API Gateway + Lambda.
 *
 * Intentionally creates **zero** AWS resources.
 */
export class AuthStack extends cdk.Stack {
  public constructor(scope: Construct, id: string, props: NovaSafeStackProps) {
    super(scope, id, mergeNovaSafeStackProps(props, 'auth'));

    cdk.Annotations.of(this).addInfo(
      'Auth service placeholder — no resources provisioned.',
    );
  }
}
