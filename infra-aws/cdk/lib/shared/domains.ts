import type { EnvironmentName, NovaSafeEnvironment } from './environments';

/** Canonical production hostnames for NovaSafe surfaces. */
export interface NovaSafeDomains {
  readonly landing: string;
  readonly start: string;
  readonly app: string;
  readonly mobileApi: string;
  readonly adminApi: string;
}

/** Domain keys for iteration and configuration maps. */
export type DomainKey = keyof NovaSafeDomains;

/**
 * Production domain configuration.
 * Non-production environments derive hostnames from these canonical values.
 */
export const PRODUCTION_DOMAINS: Readonly<NovaSafeDomains> = {
  landing: 'novasafe.io',
  start: 'start.novasafe.io',
  app: 'app.novasafe.io',
  mobileApi: 'mobile-api.novasafe.io',
  adminApi: 'admin-api.novasafe.io',
};

const DOMAIN_LABELS: Readonly<Record<DomainKey, string>> = {
  landing: 'Marketing landing',
  start: 'Marketing start flow',
  app: 'Authenticated web app',
  mobileApi: 'Mobile API',
  adminApi: 'Admin API',
};

/**
 * Returns a human-readable label for a domain key.
 */
export function domainLabel(key: DomainKey): string {
  return DOMAIN_LABELS[key];
}

/**
 * Applies an environment prefix to a hostname for non-production environments.
 */
function withEnvironmentPrefix(
  environment: NovaSafeEnvironment,
  hostname: string,
): string {
  if (environment.name === 'production') {
    return hostname;
  }

  if (!hostname.includes('.')) {
    throw new Error(`Invalid hostname: ${hostname}`);
  }

  const [subdomain, ...rest] = hostname.split('.');
  const rootDomain = rest.join('.');

  return `${environment.shortName}.${subdomain}.${rootDomain}`;
}

/**
 * Resolves the domain map for the given environment.
 */
export function getDomainsForEnvironment(
  environment: NovaSafeEnvironment,
): NovaSafeDomains {
  if (environment.name === 'production') {
    return { ...PRODUCTION_DOMAINS };
  }

  return {
    landing: withEnvironmentPrefix(environment, PRODUCTION_DOMAINS.landing),
    start: withEnvironmentPrefix(environment, PRODUCTION_DOMAINS.start),
    app: withEnvironmentPrefix(environment, PRODUCTION_DOMAINS.app),
    mobileApi: withEnvironmentPrefix(environment, PRODUCTION_DOMAINS.mobileApi),
    adminApi: withEnvironmentPrefix(environment, PRODUCTION_DOMAINS.adminApi),
  };
}

/**
 * Resolves domains directly from an environment name.
 */
export function getDomainsForEnvironmentName(
  name: EnvironmentName,
  environments: Readonly<Record<EnvironmentName, NovaSafeEnvironment>>,
): NovaSafeDomains {
  return getDomainsForEnvironment(environments[name]);
}
