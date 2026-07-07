import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';

/**
 * App stack — placeholder.
 *
 * Future responsibility: authenticated web app at app.novasafe.io
 * (S3 + CloudFront for static assets, API integration).
 *
 * Intentionally creates zero AWS resources.
 */
export class AppStack extends cdk.Stack {
  public constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    // TODO: add app frontend resources
  }
}
