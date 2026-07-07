import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';

/**
 * Landing stack — placeholder.
 *
 * Future responsibility: static marketing site at novasafe.io
 * (S3 + CloudFront, wired through Cloudflare DNS).
 *
 * Intentionally creates zero AWS resources.
 */
export class LandingStack extends cdk.Stack {
  public constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    // TODO: add marketing landing resources
  }
}
