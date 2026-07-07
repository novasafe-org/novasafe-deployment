import { getEnvironment } from '../lib/shared/environments';
import { getDomainsForEnvironment } from '../lib/shared/domains';

/**
 * Staging environment configuration entry point.
 * @todo Replace placeholder account and region before deployment.
 */
export const stagingConfig = {
  environment: getEnvironment('staging'),
  domains: getDomainsForEnvironment(getEnvironment('staging')),
} as const;
