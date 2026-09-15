import {
  DEFAULT_ALLOWED_REPOSITORIES,
  DEFAULT_CONTRIBUTIONS_PER_HOUR,
} from '../constants.ts';
import { OctokitHost } from '../github/OctokitHost.ts';
import type { ContributionRouteSettings } from '../v1/contributions.ts';

import { parseAllowedRepositories } from './repositoryName.ts';

/** The shortest contribution secret accepted, in characters. */
const MIN_SECRET_LENGTH = 32;

/**
 * Read how contributions become pull requests from the environment.
 * @param env - The process environment.
 * @returns The settings, or `undefined` when `GITHUB_TOKEN` is unset and
 * submitting is therefore disabled.
 * @throws {Error} When a token is set but the secret signing continuations is
 * missing or too short.
 */
export function readContributionSettings(
  env: Readonly<Record<string, string | undefined>>,
): ContributionRouteSettings | undefined {
  const token = env.GITHUB_TOKEN?.trim();
  if (!token) return undefined;

  const secret = env.CONTRIBUTION_SECRET?.trim() ?? '';
  if (secret.length < MIN_SECRET_LENGTH) {
    throw new Error(
      `CONTRIBUTION_SECRET must be at least ${MIN_SECRET_LENGTH} characters whenever GITHUB_TOKEN is set; generate one with: openssl rand -hex 32`,
    );
  }

  const perHour = Number(env.CONTRIBUTIONS_PER_HOUR);
  return {
    host: new OctokitHost({ token }),
    secret,
    allowedRepositories: parseAllowedRepositories(
      env.ALLOWED_REPOSITORIES ?? DEFAULT_ALLOWED_REPOSITORIES,
    ),
    perHour:
      Number.isSafeInteger(perHour) && perHour > 0
        ? perHour
        : DEFAULT_CONTRIBUTIONS_PER_HOUR,
  };
}
