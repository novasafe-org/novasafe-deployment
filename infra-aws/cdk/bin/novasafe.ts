#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';

/**
 * NovaSafe CDK application entry point.
 *
 * Usage (future):
 *   npx cdk synth -c env=development
 *   npx cdk deploy -c env=staging
 *
 * This skeleton intentionally creates zero AWS resources.
 * Stack wiring will be enabled in future implementation tasks.
 */
const app = new cdk.App();

// TODO: resolve environment from context, e.g. app.node.tryGetContext('env')
// TODO: load config from config/{environment}.ts
// TODO: instantiate FoundationStack, MarketingStack, Platform stacks, etc.

app.synth();
