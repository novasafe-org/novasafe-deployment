import {
  apiName,
  bucketName,
  distributionName,
  lambdaName,
  stackName,
} from '../../lib/shared/naming';
import { getEnvironment } from '../../lib/shared/environments';

describe('naming helpers', () => {
  const environment = getEnvironment('development');

  it('builds consistent stack names', () => {
    expect(stackName(environment, 'foundation')).toBe('novasafe-dev-foundation');
  });

  it('builds consistent bucket names', () => {
    expect(bucketName(environment, 'landing')).toBe('novasafe-dev-bucket-landing');
  });

  it('builds consistent lambda names', () => {
    expect(lambdaName(environment, 'auth')).toBe('novasafe-dev-fn-auth');
  });

  it('builds consistent distribution names', () => {
    expect(distributionName(environment, 'app')).toBe('novasafe-dev-cdn-app');
  });

  it('builds consistent api names', () => {
    expect(apiName(environment, 'mobile')).toBe('novasafe-dev-api-mobile');
  });
});
