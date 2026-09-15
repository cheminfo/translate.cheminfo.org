import { Octokit } from '@octokit/rest';

import type {
  FileChange,
  OpenPullRequestOptions,
  PullRequestInfo,
  RepositoryHost,
  RepositoryInfo,
  RepositoryName,
} from './RepositoryHost.ts';

/** How the GitHub client is set up. */
export interface OctokitHostOptions {
  /** A token of the bot account, with the `public_repo` scope. */
  token: string;
  /**
   * The fetch implementation requests go through.
   * @default globalThis.fetch
   */
  fetch?: typeof globalThis.fetch;
  /**
   * How long to wait between two checks that a new fork is ready, in ms.
   * @default 2000
   */
  forkPollInterval?: number;
  /**
   * How many times to check that a new fork is ready before giving up.
   * @default 30
   */
  forkPollAttempts?: number;
}

/**
 * The GitHub REST API, reduced to what publishing a translation needs.
 */
export class OctokitHost implements RepositoryHost {
  readonly #octokit: Octokit;
  readonly #forkPollInterval: number;
  readonly #forkPollAttempts: number;

  public constructor(options: OctokitHostOptions) {
    const {
      token,
      fetch,
      forkPollInterval = 2000,
      forkPollAttempts = 30,
    } = options;
    this.#octokit = new Octokit({
      auth: token,
      userAgent: 'translate.cheminfo.org',
      request: fetch === undefined ? {} : { fetch },
    });
    this.#forkPollInterval = forkPollInterval;
    this.#forkPollAttempts = forkPollAttempts;
  }

  public async describe(
    repository: RepositoryName,
  ): Promise<RepositoryInfo | undefined> {
    try {
      const { data } = await this.#octokit.rest.repos.get({ ...repository });
      if (data.private) return undefined;
      return {
        defaultBranch: data.default_branch,
        canPush: data.permissions?.push === true,
      };
    } catch (error) {
      if (statusOf(error) === 404) return undefined;
      throw error;
    }
  }

  public async readFile(
    repository: RepositoryName,
    path: string,
    ref: string,
  ): Promise<string | undefined> {
    try {
      const { data } = await this.#octokit.rest.repos.getContent({
        ...repository,
        path,
        ref,
        mediaType: { format: 'raw' },
      });
      // The raw media type arrives as text or as bytes depending on the
      // content type GitHub labels the file with.
      const content: unknown = data;
      if (typeof content === 'string') return content;
      if (content instanceof ArrayBuffer) {
        return new TextDecoder().decode(content);
      }
      return undefined;
    } catch (error) {
      if (statusOf(error) === 404) return undefined;
      throw error;
    }
  }

  public async headOf(
    repository: RepositoryName,
    branch: string,
  ): Promise<string> {
    const { data } = await this.#octokit.rest.git.getRef({
      ...repository,
      ref: `heads/${branch}`,
    });
    return data.object.sha;
  }

  public async forkOf(repository: RepositoryName): Promise<RepositoryName> {
    const { data } = await this.#octokit.rest.repos.createFork({
      ...repository,
      // eslint-disable-next-line camelcase -- a GitHub REST API parameter
      default_branch_only: true,
    });
    const fork = { owner: data.owner.login, repo: data.name };

    // GitHub creates a fork asynchronously: the answer comes before the
    // repository can be read or written.
    /* eslint-disable no-await-in-loop -- polling until the fork exists */
    for (let attempt = 0; attempt < this.#forkPollAttempts; attempt++) {
      if ((await this.describe(fork)) !== undefined) return fork;
      await new Promise((resolve) => {
        setTimeout(resolve, this.#forkPollInterval);
      });
    }
    /* eslint-enable no-await-in-loop */
    throw new Error(`the fork ${fork.owner}/${fork.repo} never became ready`);
  }

  public async createBranch(
    repository: RepositoryName,
    branch: string,
    sha: string,
  ): Promise<void> {
    await this.#octokit.rest.git.createRef({
      ...repository,
      ref: `refs/heads/${branch}`,
      sha,
    });
  }

  public async commit(
    repository: RepositoryName,
    branch: string,
    files: FileChange[],
    message: string,
  ): Promise<void> {
    const head = await this.headOf(repository, branch);
    const { data: parent } = await this.#octokit.rest.git.getCommit({
      ...repository,
      // eslint-disable-next-line camelcase -- a GitHub REST API parameter
      commit_sha: head,
    });
    const { data: tree } = await this.#octokit.rest.git.createTree({
      ...repository,
      // eslint-disable-next-line camelcase -- a GitHub REST API parameter
      base_tree: parent.tree.sha,
      tree: files.map((file) => ({
        path: file.path,
        mode: '100644' as const,
        type: 'blob' as const,
        content: file.content,
      })),
    });
    const { data: commit } = await this.#octokit.rest.git.createCommit({
      ...repository,
      message,
      tree: tree.sha,
      parents: [head],
    });
    await this.#octokit.rest.git.updateRef({
      ...repository,
      ref: `heads/${branch}`,
      sha: commit.sha,
    });
  }

  public async openPullRequest(
    options: OpenPullRequestOptions,
  ): Promise<{ number: number; url: string }> {
    const { repository, base, head, branch, title, body } = options;
    const fromFork =
      head.owner.toLowerCase() !== repository.owner.toLowerCase();
    const { data } = await this.#octokit.rest.pulls.create({
      ...repository,
      base,
      head: fromFork ? `${head.owner}:${branch}` : branch,
      title,
      body,
      // eslint-disable-next-line camelcase -- a GitHub REST API parameter
      ...(fromFork ? { maintainer_can_modify: true } : {}),
    });
    return { number: data.number, url: data.html_url };
  }

  public async pullRequest(
    repository: RepositoryName,
    number: number,
  ): Promise<PullRequestInfo | undefined> {
    try {
      const { data } = await this.#octokit.rest.pulls.get({
        ...repository,
        // eslint-disable-next-line camelcase -- a GitHub REST API parameter
        pull_number: number,
      });
      if (data.head.repo === null) return undefined;
      return {
        number: data.number,
        url: data.html_url,
        state: data.state === 'open' ? 'open' : 'closed',
        head: { owner: data.head.repo.owner.login, repo: data.head.repo.name },
        branch: data.head.ref,
      };
    } catch (error) {
      if (statusOf(error) === 404) return undefined;
      throw error;
    }
  }
}

function statusOf(error: unknown): number | undefined {
  if (
    typeof error === 'object' &&
    error !== null &&
    'status' in error &&
    typeof error.status === 'number'
  ) {
    return error.status;
  }
  return undefined;
}
