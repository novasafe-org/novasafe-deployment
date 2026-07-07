import { getEnvironment } from '../lib/shared/environments';
import { getDomainsForEnvironment } from '../lib/shared/domains';

/**
 * Development environment configuration entry point.
 * @todo Replace placeholder account and region before deployment.
 */
export const developmentConfig = {
  environment: getEnvironment('development'),
  domains: getDomainsForEnvironment(getEnvironment('development')),
} as const;
