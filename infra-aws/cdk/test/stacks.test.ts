import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { FoundationStack } from '../lib/foundation/foundation-stack';
import { MonitoringStack } from '../lib/observability/monitoring-stack';
import { AdminApiStack } from '../lib/platform/admin-api-stack';
import { ApiStack } from '../lib/platform/api-stack';
import { SecurityStack } from '../lib/security/security-stack';
import { getDomainsForEnvironment } from '../lib/shared/domains';
import {
  getEnvironment,
  toCdkEnvironment,
} from '../lib/shared/environments';
import type { NovaSafeStackProps } from '../lib/shared/types';
import { QueueStack } from '../lib/workers/queue-stack';
import type { Construct } from 'constructs';

function createStackProps(environmentName: 'development' | 'staging' | 'production'): NovaSafeStackProps {
  const environment = getEnvironment(environmentName);

  return {
    environment,
    domains: getDomainsForEnvironment(environment),
    env: toCdkEnvironment(environment),
  };
}

function expectEmptyStack(
  StackClass: new (scope: Construct, id: string, props: NovaSafeStackProps) => cdk.Stack,
  id: string,
  props: NovaSafeStackProps,
): void {
  const app = new cdk.App();
  const stack = new StackClass(app, id, props);
  const template = Template.fromStack(stack);
  const resources = template.toJSON().Resources ?? {};

  expect(Object.keys(resources)).toHaveLength(0);
}

describe('placeholder stacks', () => {
  const props = createStackProps('development');

  it.each([
    ['FoundationStack', FoundationStack],
    ['ApiStack', ApiStack],
    ['AdminApiStack', AdminApiStack],
    ['QueueStack', QueueStack],
    ['SecurityStack', SecurityStack],
    ['MonitoringStack', MonitoringStack],
  ])('%s provisions zero AWS resources', (_name, StackClass) => {
    expectEmptyStack(StackClass, 'test-stack', props);
  });
});
