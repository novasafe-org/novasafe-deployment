import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import type { NovaSafeStackProps } from '../shared/types';
import { mergeNovaSafeStackProps } from '../shared/types';

/**
 * Landing stack — static marketing site infrastructure.
 *
 * Future responsibility: host **novasafe.io** and related marketing surfaces
 * (S3 + CloudFront, wired through Cloudflare DNS).
 *
 * Intentionally creates **zero** AWS resources.
 */
export class LandingStack extends cdk.Stack {
  public constructor(scope: Construct, id: string, props: NovaSafeStackProps) {
    super(scope, id, mergeNovaSafeStackProps(props, 'landing'));

    cdk.Annotations.of(this).addInfo(
      `Landing placeholder for ${props.domains.landing} — no resources provisioned.`,
    );
  }
}
