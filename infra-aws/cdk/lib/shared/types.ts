import type * as cdk from 'aws-cdk-lib';
import type { NovaSafeDomains } from './domains';
import type { NovaSafeEnvironment } from './environments';
import { environmentLabel, toCdkEnvironment } from './environments';
import { getStandardTags } from './tags';

/**
 * Base props shared by every NovaSafe CDK stack.
 */
export interface NovaSafeStackProps extends cdk.StackProps {
  readonly environment: NovaSafeEnvironment;
  readonly domains: NovaSafeDomains;
}

/**
 * Merges NovaSafe conventions into CDK stack props without creating resources.
 */
export function mergeNovaSafeStackProps(
  props: NovaSafeStackProps,
  component: string,
): cdk.StackProps {
  return {
    ...props,
    env: props.env ?? toCdkEnvironment(props.environment),
    description:
      props.description ??
      `${environmentLabel(props.environment)} — ${component} stack (placeholder)`,
    tags: {
      ...getStandardTags(props.environment, component),
      ...props.tags,
    },
  };
}
