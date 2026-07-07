import * as cdk from 'aws-cdk-lib';
import {
  ENVIRONMENTS,
  getEnvironment,
  resolveEnvironment,
  resolveEnvironmentName,
} from '../../lib/shared/environments';

describe('environment definitions', () => {
  it('defines development, staging, and production', () => {
    expect(Object.keys(ENVIRONMENTS).sort()).toEqual([
      'development',
      'production',
      'staging',
    ]);
  });

  it('uses placeholder account identifiers', () => {
    expect(getEnvironment('development').awsAccount).toBe('111111111111');
    expect(getEnvironment('staging').awsAccount).toBe('222222222222');
    expect(getEnvironment('production').awsAccount).toBe('333333333333');
  });

  it('defaults to development when context is missing', () => {
    const app = new cdk.App();
    expect(resolveEnvironmentName(app)).toBe('development');
    expect(resolveEnvironment(app).name).toBe('development');
  });

  it('reads the environment from CDK context', () => {
    const app = new cdk.App({ context: { env: 'staging' } });
    expect(resolveEnvironmentName(app)).toBe('staging');
  });
});
