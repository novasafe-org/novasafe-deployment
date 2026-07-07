import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import type { NovaSafeStackProps } from '../shared/types';
import { mergeNovaSafeStackProps } from '../shared/types';

/**
 * API stack — mobile API infrastructure.
 *
 * Future responsibility: **mobile-api.novasafe.io** (API Gateway + Lambda,
 * MongoDB Atlas connectivity).
 *
 * Intentionally creates **zero** AWS resources.
 */
export class ApiStack extends cdk.Stack {
  public constructor(scope: Construct, id: string, props: NovaSafeStackProps) {
    super(scope, id, mergeNovaSafeStackProps(props, 'mobile-api'));

    cdk.Annotations.of(this).addInfo(
      `Mobile API placeholder for ${props.domains.mobileApi} — no resources provisioned.`,
    );
  }
}
