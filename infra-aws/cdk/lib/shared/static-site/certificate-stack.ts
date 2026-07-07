import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';

export interface SiteCertificateStackProps extends cdk.StackProps {
  readonly primaryDomain: string;
  readonly subjectAlternativeNames: readonly string[];
}

/**
 * Child stack in `us-east-1` — required for CloudFront custom TLS certificates.
 *
 * DNS validation records must be added in Cloudflare manually (no Route53).
 */
export class SiteCertificateStack extends cdk.Stack {
  public readonly certificate: acm.Certificate;

  public constructor(scope: Construct, id: string, props: SiteCertificateStackProps) {
    const parentStack = cdk.Stack.of(scope);

    super(scope, id, {
      ...props,
      env: {
        account: parentStack.account,
        region: 'us-east-1',
      },
      description: `ACM certificate for ${props.primaryDomain} (us-east-1, DNS validation)`,
    });

    this.certificate = new acm.Certificate(this, 'Certificate', {
      domainName: props.primaryDomain,
      ...(props.subjectAlternativeNames.length > 0
        ? { subjectAlternativeNames: [...props.subjectAlternativeNames] }
        : {}),
      validation: acm.CertificateValidation.fromDns(),
    });

    new cdk.CfnOutput(this, 'CertificateArn', {
      value: this.certificate.certificateArn,
      description: 'ACM certificate ARN (must be in us-east-1 for CloudFront)',
    });

    new cdk.CfnOutput(this, 'DnsValidationNote', {
      value:
        'Add the ACM DNS validation CNAME records in Cloudflare before the certificate becomes ISSUED.',
      description: 'Manual DNS validation required — Route53 is not used',
    });
  }
}
