import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import type { NovaSafeStackProps } from '../shared/types';
import { mergeNovaSafeStackProps } from '../shared/types';

/**
 * App stack — authenticated web application infrastructure.
 *
 * Future responsibility: **app.novasafe.io** (S3 + CloudFront static hosting,
 * integration with auth and APIs).
 *
 * Intentionally creates **zero** AWS resources.
 */
export class AppStack extends cdk.Stack {
  public constructor(scope: Construct, id: string, props: NovaSafeStackProps) {
    super(scope, id, mergeNovaSafeStackProps(props, 'app'));

    cdk.Annotations.of(this).addInfo(
      `App placeholder for ${props.domains.app} — no resources provisioned.`,
    );
  }
}
