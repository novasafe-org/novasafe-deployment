import { APPLICATION_NAME, REPOSITORY_NAME } from '../../lib/shared/constants';
import { getEnvironment } from '../../lib/shared/environments';
import { getStandardTags } from '../../lib/shared/tags';

describe('standard tags', () => {
  it('returns the required NovaSafe tag set', () => {
    const tags = getStandardTags(getEnvironment('staging'), 'platform');

    expect(tags.Application).toBe(APPLICATION_NAME);
    expect(tags.Environment).toBe('staging');
    expect(tags.Repository).toBe(REPOSITORY_NAME);
    expect(tags.ManagedBy).toBe('aws-cdk');
    expect(tags.Owner).toBe('novasafe-org');
    expect(tags.Component).toBe('platform');
    expect(tags.Version).toBe('0.1.0');
  });
});
