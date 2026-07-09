import {
  getEnvironment,
  resolveAwsAccount,
  resolveAwsRegion,
  toCdkEnvironment,
} from '../lib/shared/environments';

describe('environment resolution', () => {
  const originalAccount = process.env.CDK_DEFAULT_ACCOUNT;
  const originalRegion = process.env.CDK_DEFAULT_REGION;

  afterEach(() => {
    if (originalAccount === undefined) {
      delete process.env.CDK_DEFAULT_ACCOUNT;
    } else {
      process.env.CDK_DEFAULT_ACCOUNT = originalAccount;
    }

    if (originalRegion === undefined) {
      delete process.env.CDK_DEFAULT_REGION;
    } else {
      process.env.CDK_DEFAULT_REGION = originalRegion;
    }
  });

  it('prefers CDK_DEFAULT_ACCOUNT and CDK_DEFAULT_REGION from the environment', () => {
    process.env.CDK_DEFAULT_ACCOUNT = '793239449172';
    process.env.CDK_DEFAULT_REGION = 'ap-south-1';

    const environment = getEnvironment('production');

    expect(resolveAwsAccount(environment)).toBe('793239449172');
    expect(resolveAwsRegion(environment)).toBe('ap-south-1');
    expect(toCdkEnvironment(environment)).toEqual({
      account: '793239449172',
      region: 'ap-south-1',
    });
  });
});
