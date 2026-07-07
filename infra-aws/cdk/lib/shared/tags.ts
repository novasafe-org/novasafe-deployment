import {
  APPLICATION_NAME,
  DEFAULT_OWNER,
  INFRASTRUCTURE_VERSION,
  MANAGED_BY,
  REPOSITORY_NAME,
} from './constants';
import type { NovaSafeEnvironment } from './environments';

/** Standard tag keys applied to NovaSafe AWS resources. */
export interface NovaSafeStandardTags {
  readonly Application: string;
  readonly Environment: string;
  readonly Repository: string;
  readonly ManagedBy: string;
  readonly Owner: string;
  readonly Component: string;
  readonly Version: string;
}

export interface StandardTagsOptions {
  /** Override the infrastructure version tag. */
  readonly version?: string;
  /** Additional tags merged on top of the standard set. */
  readonly additionalTags?: Readonly<Record<string, string>>;
}

/**
 * Returns the standard NovaSafe resource tags for a stack component.
 */
export function getStandardTags(
  environment: NovaSafeEnvironment,
  component: string,
  options: StandardTagsOptions = {},
): NovaSafeStandardTags & Record<string, string> {
  const version = options.version ?? INFRASTRUCTURE_VERSION;

  return {
    Application: APPLICATION_NAME,
    Environment: environment.name,
    Repository: REPOSITORY_NAME,
    ManagedBy: MANAGED_BY,
    Owner: DEFAULT_OWNER,
    Component: component,
    Version: version,
    ...environment.tags,
    ...options.additionalTags,
  };
}
