import { PRODUCTION_DOMAINS, getDomainsForEnvironment } from '../../lib/shared/domains';
import { getEnvironment } from '../../lib/shared/environments';

describe('domain configuration', () => {
  it('exposes canonical production hostnames', () => {
    expect(PRODUCTION_DOMAINS).toEqual({
      landing: 'novasafe.io',
      start: 'start.novasafe.io',
      app: 'app.novasafe.io',
      mobileApi: 'mobile-api.novasafe.io',
      adminApi: 'admin-api.novasafe.io',
    });
  });

  it('prefixes non-production hostnames with the environment short name', () => {
    const domains = getDomainsForEnvironment(getEnvironment('development'));

    expect(domains.landing).toBe('dev.novasafe.io');
    expect(domains.start).toBe('dev.start.novasafe.io');
    expect(domains.app).toBe('dev.app.novasafe.io');
    expect(domains.mobileApi).toBe('dev.mobile-api.novasafe.io');
    expect(domains.adminApi).toBe('dev.admin-api.novasafe.io');
  });

  it('returns production hostnames unchanged', () => {
    expect(getDomainsForEnvironment(getEnvironment('production'))).toEqual(
      PRODUCTION_DOMAINS,
    );
  });
});
