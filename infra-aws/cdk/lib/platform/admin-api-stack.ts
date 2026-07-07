import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import type { NovaSafeStackProps } from '../shared/types';
import { mergeNovaSafeStackProps } from '../shared/types';

/**
 * Admin API stack — administrative API infrastructure.
 *
 * Future responsibility: **admin-api.novasafe.io** (API Gateway + Lambda,
 * MongoDB Atlas connectivity).
 *
 * Intentionally creates **zero** AWS resources.
 */
export class AdminApiStack extends cdk.Stack {
  public constructor(scope: Construct, id: string, props: NovaSafeStackProps) {
    super(scope, id, mergeNovaSafeStackProps(props, 'admin-api'));

    cdk.Annotations.of(this).addInfo(
      `Admin API placeholder for ${props.domains.adminApi} — no resources provisioned.`,
    );
  }
}
