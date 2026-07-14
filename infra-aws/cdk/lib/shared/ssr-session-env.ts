import type { NovaSafeDomains } from './domains';

/**
 * Shared session cookie env for auth + app SSR Lambdas.
 *
 * Without AUTH_COOKIE_DOMAIN=.novasafe.io the cookie is host-only on start.*
 * and app.* never receives it → login redirect loop.
 */
export function ssrSessionEnvironmentVariables(
  domains: NovaSafeDomains,
): Record<string, string> {
  const rootDomain = domains.landing.replace(/^www\./, '');

  return {
    AUTH_COOKIE_NAME: 'ns_session',
    AUTH_COOKIE_DOMAIN: `.${rootDomain}`,
    AUTH_COOKIE_SECURE: 'true',
    AUTH_COOKIE_SAMESITE: 'lax',
    AUTH_COOKIE_MAX_AGE: '1800',
    AUTH_COOKIE_PATH: '/',
  };
}
