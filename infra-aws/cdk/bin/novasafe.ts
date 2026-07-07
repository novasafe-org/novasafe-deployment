#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { getGitHubOidcConfig } from '../config/github';
import { FoundationStack } from '../lib/foundation/foundation-stack';
import { LandingStack } from '../lib/marketing/landing-stack';
import { MonitoringStack } from '../lib/observability/monitoring-stack';
import { AdminApiStack } from '../lib/platform/admin-api-stack';
import { ApiStack } from '../lib/platform/api-stack';
import { AppStack } from '../lib/platform/app-stack';
import { AuthStack } from '../lib/platform/auth-stack';
import { GitHubOidcStack } from '../lib/security/github-oidc-stack';
import { SecurityStack } from '../lib/security/security-stack';
import { getDomainsForEnvironment } from '../lib/shared/domains';
import {
  resolveEnvironment,
  resolveEnvironmentName,
  toCdkEnvironment,
} from '../lib/shared/environments';
import { stackName } from '../lib/shared/naming';
import type { NovaSafeStackProps } from '../lib/shared/types';
import { QueueStack } from '../lib/workers/queue-stack';

/**
 * NovaSafe CDK application entry point.
 *
 * Usage:
 *   npm run synth
 *   npm run synth -- -c env=staging
 *   npm run synth -- -c env=production
 *
 * Application stacks remain placeholders. GitHubOidcStack provisions IAM
 * authentication resources only (OIDC provider + deploy role).
 */
const app = new cdk.App();
const environment = resolveEnvironment(app);
const environmentName = resolveEnvironmentName(app);
const domains = getDomainsForEnvironment(environment);

const stackProps: NovaSafeStackProps = {
  environment,
  domains,
  env: toCdkEnvironment(environment),
};

new FoundationStack(app, stackName(environment, 'foundation'), stackProps);
new GitHubOidcStack(app, stackName(environment, 'github-oidc'), {
  ...stackProps,
  github: getGitHubOidcConfig(environmentName),
});
new LandingStack(app, stackName(environment, 'landing'), stackProps);
new AuthStack(app, stackName(environment, 'auth'), stackProps);
new AppStack(app, stackName(environment, 'app'), stackProps);
new ApiStack(app, stackName(environment, 'mobile-api'), stackProps);
new AdminApiStack(app, stackName(environment, 'admin-api'), stackProps);
new QueueStack(app, stackName(environment, 'workers'), stackProps);
new SecurityStack(app, stackName(environment, 'security'), stackProps);
new MonitoringStack(app, stackName(environment, 'observability'), stackProps);
