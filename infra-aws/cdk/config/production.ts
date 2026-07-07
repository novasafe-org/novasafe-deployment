import { getEnvironment } from '../lib/shared/environments';
import { getDomainsForEnvironment } from '../lib/shared/domains';

/**
 * Production environment configuration entry point.
 * @todo Replace placeholder account and region before deployment.
 */
export const productionConfig = {
  environment: getEnvironment('production'),
  domains: getDomainsForEnvironment(getEnvironment('production')),
} as const;
