import type { Messages } from 'translate-core';
import {
  catalogFile,
  changedKeys,
  mergeMessages,
  parseMessages,
  serializeMessages,
} from 'translate-core';

import type {
  FileChange,
  RepositoryHost,
  RepositoryName,
} from '../github/RepositoryHost.ts';

import type { ChangeSummary } from './pullRequestText.ts';
import {
  BRANCH_PREFIX,
  commitMessage,
  pullRequestBody,
  pullRequestTitle,
} from './pullRequestText.ts';
import type { ValidatedRepository } from './validateContribution.ts';

/** What publishing one repository's change needs. */
export interface PublishContext {
  /** Where the change is written. */
  host: RepositoryHost;
  /** The locale translated into. */
  locale: string;
  /**
   * The name the translator gave.
   * @default undefined
   */
  contributor?: string;
  /**
   * The note the translator left.
   * @default undefined
   */
  note?: string;
  /**
   * A pull request this translator opened on the repository before.
   * @default undefined
   */
  pullRequestNumber?: number;
  /** A suffix that makes a new branch name unique. */
  branchSuffix: () => string;
}

/** The pull request a change went to. */
export interface Published {
  /** Its number. */
  number: number;
  /** Where to read it. */
  url: string;
  /** How many messages the change made. */
  messageCount: number;
  /** Whether an open pull request was added to. */
  updated: boolean;
}

/**
 * Write one repository's translated messages: as a new commit on the
 * translator's open pull request when there is one, otherwise on a new branch
 * — in the repository itself when the bot may push there, in its fork
 * otherwise — with a pull request opened from it.
 * @param target - The repository and its validated catalogs.
 * @param context - Where and how to write.
 * @returns The pull request, or `undefined` when no message actually changed.
 */
export async function publishRepository(
  target: ValidatedRepository,
  context: PublishContext,
): Promise<Published | undefined> {
  const { host, locale, contributor, note, pullRequestNumber, branchSuffix } =
    context;
  const { repository, info, catalogs } = target;

  const previous =
    pullRequestNumber === undefined
      ? undefined
      : await host.pullRequest(repository, pullRequestNumber);
  const resumed =
    previous?.state === 'open' && previous.branch.startsWith(BRANCH_PREFIX)
      ? previous
      : undefined;

  const files: FileChange[] = [];
  const summary: ChangeSummary = { locale, catalogs: [], contributor, note };
  let messageCount = 0;

  /* eslint-disable no-await-in-loop -- files are read one after another from the same repository */
  for (const catalog of catalogs) {
    const path = catalogFile(catalog.directory, locale);
    const existing = await readMessages(
      host,
      resumed?.head ?? repository,
      path,
      resumed?.branch ?? info.defaultBranch,
    );
    const keys = changedKeys(existing, catalog.messages);
    if (keys.length === 0) continue;
    files.push({
      path,
      content: serializeMessages(
        mergeMessages(catalog.source, existing, catalog.messages),
      ),
    });
    summary.catalogs.push({ directory: catalog.directory, count: keys.length });
    messageCount += keys.length;
  }
  /* eslint-enable no-await-in-loop */

  if (files.length === 0) return undefined;

  if (resumed !== undefined) {
    await host.commit(
      resumed.head,
      resumed.branch,
      files,
      commitMessage(summary),
    );
    return {
      number: resumed.number,
      url: resumed.url,
      messageCount,
      updated: true,
    };
  }

  const head = info.canPush ? repository : await host.forkOf(repository);
  const branch = `${BRANCH_PREFIX}${locale}-${branchSuffix()}`;
  const base = await host.headOf(repository, info.defaultBranch);
  await host.createBranch(head, branch, base);
  await host.commit(head, branch, files, commitMessage(summary));
  const opened = await host.openPullRequest({
    repository,
    base: info.defaultBranch,
    head,
    branch,
    title: pullRequestTitle(locale, messageCount),
    body: pullRequestBody(summary),
  });
  return { ...opened, messageCount, updated: false };
}

async function readMessages(
  host: RepositoryHost,
  repository: RepositoryName,
  path: string,
  ref: string,
): Promise<Messages> {
  const text = await host.readFile(repository, path, ref);
  return text === undefined ? {} : parseMessages(text);
}
