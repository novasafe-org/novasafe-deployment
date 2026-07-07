import { resolveStaticSiteDomainNames } from '../../lib/shared/static-site/domain-names';
import { getEnvironment } from '../../lib/shared/environments';

describe('static site domain names', () => {
  it('includes www alias for production', () => {
    const domains = resolveStaticSiteDomainNames(
      'novasafe.io',
      getEnvironment('production'),
    );

    expect(domains.all).toEqual(['novasafe.io', 'www.novasafe.io']);
  });

  it('uses environment hostname only for development', () => {
    const domains = resolveStaticSiteDomainNames(
      'dev.novasafe.io',
      getEnvironment('development'),
    );

    expect(domains.all).toEqual(['dev.novasafe.io']);
  });
});
