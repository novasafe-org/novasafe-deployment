import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import type { NovaSafeStackProps } from '../shared/types';
import { mergeNovaSafeStackProps } from '../shared/types';
import { validateNovaSafeConfiguration } from '../shared/validation';

/**
 * Foundation stack — global configuration anchor for NovaSafe infrastructure.
 *
 * Validates shared environment and domain configuration at synthesis time.
 * Future responsibility: account-level baselines (bootstrap alignment, shared
 * parameters, optional networking) consumed by other stacks.
 *
 * Intentionally creates **zero** AWS resources.
 */
export class FoundationStack extends cdk.Stack {
  public constructor(scope: Construct, id: string, props: NovaSafeStackProps) {
    super(scope, id, mergeNovaSafeStackProps(props, 'foundation'));

    validateNovaSafeConfiguration(props.environment, props.domains);

    cdk.Annotations.of(this).addInfo(
      `Foundation configuration validated for ${props.environment.name}. ` +
        'No AWS resources are provisioned in this stack yet.',
    );
  }
}
