import type {
  Contribution,
  ContributionProblem,
  ContributionPullRequest,
  ContributionResult,
} from 'react-cheminfo/translate';

import type { RepositoryHost } from '../github/RepositoryHost.ts';
import { readContinuation, signContinuation } from '../utils/continuation.ts';
import { formatRepository } from '../utils/repositoryName.ts';

import { publishRepository } from './publishRepository.ts';
import { validateContribution } from './validateContribution.ts';

/** How contributions become pull requests. */
export interface ContributionSettings {
  /** Where pull requests are opened. */
  host: RepositoryHost;
  /** Signs the continuation tokens. */
  secret: string;
  /** `owner/repo` or `owner/*` patterns pull requests may be opened on. */
  allowedRepositories: readonly string[];
  /**
   * Makes a new branch name unique.
   * @default a random 8-character suffix
   */
  branchSuffix?: () => string;
}

/** A contribution that failed its checks; nothing was written. */
export class ContributionRejectedError extends Error {
  public readonly problems: ContributionProblem[];

  public constructor(problems: ContributionProblem[]) {
    super('The contribution was refused.');
    this.name = 'ContributionRejectedError';
    this.problems = problems;
  }
}

/**
 * Check a contribution, then open or update one pull request per repository.
 * Nothing is written unless every message of every catalog passes.
 * @param contribution - What the overlay sent.
 * @param settings - How and where to publish.
 * @returns The pull requests written to.
 * @throws {ContributionRejectedError} When any check fails.
 */
export async function proposeContribution(
  contribution: Contribution,
  settings: ContributionSettings,
): Promise<ContributionResult> {
  const { host, secret, branchSuffix = randomSuffix } = settings;
  const { repositories, problems } = await validateContribution(
    contribution,
    settings,
  );
  if (problems.length > 0) throw new ContributionRejectedError(problems);

  const previous = new Map<string, number>();
  /* eslint-disable no-await-in-loop -- tokens, then repositories, one after another */
  for (const token of contribution.continuations ?? []) {
    const continuation = await readContinuation(secret, token);
    if (continuation !== undefined) {
      previous.set(continuation.repository.toLowerCase(), continuation.number);
    }
  }

  const pullRequests: ContributionPullRequest[] = [];
  for (const target of repositories) {
    const repository = formatRepository(target.repository);
    const published = await publishRepository(target, {
      host,
      locale: contribution.locale,
      contributor: contribution.contributor,
      note: contribution.note,
      pullRequestNumber: previous.get(repository.toLowerCase()),
      branchSuffix,
    });
    if (published === undefined) continue;
    pullRequests.push({
      repository,
      ...published,
      continuation: await signContinuation(secret, {
        repository,
        number: published.number,
      }),
    });
  }
  /* eslint-enable no-await-in-loop */

  return { pullRequests };
}

function randomSuffix(): string {
  return crypto.randomUUID().slice(0, 8);
}
