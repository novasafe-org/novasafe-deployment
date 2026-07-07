import type { NovaSafeDomains } from './domains';
import type { NovaSafeEnvironment } from './environments';

/**
 * Validates shared NovaSafe configuration used across stacks.
 * Throws when required values are missing or malformed.
 */
export function validateNovaSafeConfiguration(
  environment: NovaSafeEnvironment,
  domains: NovaSafeDomains,
): void {
  if (!environment.awsAccount || !/^\d{12}$/.test(environment.awsAccount)) {
    throw new Error(
      `Environment "${environment.name}" requires a 12-digit placeholder awsAccount before synthesis.`,
    );
  }

  if (!environment.awsRegion) {
    throw new Error(`Environment "${environment.name}" requires awsRegion.`);
  }

  const entries = Object.entries(domains) as Array<[string, string]>;
  for (const [key, hostname] of entries) {
    if (!hostname.includes('.')) {
      throw new Error(`Domain "${key}" is invalid: ${hostname}`);
    }
  }
}
