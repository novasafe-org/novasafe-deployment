import type { NovaSafeEnvironment } from '../environments';

/**
 * Resolved domain names for a static website (apex + optional www).
 */
export interface StaticSiteDomainNames {
  readonly primary: string;
  readonly aliases: readonly string[];
  readonly all: readonly string[];
}

/**
 * Resolves CloudFront / ACM domain names for a static site.
 *
 * Production includes `www.` for apex marketing domains.
 * Non-production environments use the environment-prefixed hostname only.
 */
export function resolveStaticSiteDomainNames(
  primaryDomain: string,
  environment: NovaSafeEnvironment,
  options: { readonly includeWww?: boolean } = {},
): StaticSiteDomainNames {
  const includeWww = options.includeWww ?? environment.name === 'production';
  const aliases = includeWww ? [`www.${primaryDomain}`] : [];

  return {
    primary: primaryDomain,
    aliases,
    all: [primaryDomain, ...aliases],
  };
}
