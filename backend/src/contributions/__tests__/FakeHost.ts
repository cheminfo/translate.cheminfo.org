import type {
  FileChange,
  OpenPullRequestOptions,
  PullRequestInfo,
  RepositoryHost,
  RepositoryInfo,
  RepositoryName,
} from '../../github/RepositoryHost.ts';
import { formatRepository } from '../../utils/repositoryName.ts';

interface FakeRepository {
  info: RepositoryInfo;
  branches: Map<string, string>;
}

/** A pull request as the fake host keeps it. */
export interface FakePullRequest extends PullRequestInfo {
  repository: string;
  base: string;
  title: string;
  body: string;
}

/** An in-memory GitHub: repositories, branches as snapshots, forks and PRs. */
export class FakeHost implements RepositoryHost {
  public readonly pullRequests: FakePullRequest[] = [];
  public readonly forks: string[] = [];
  public readonly commits: Array<{
    repository: string;
    branch: string;
    paths: string[];
    message: string;
  }> = [];

  /** An operation that fails with a server error, to test the error path. */
  public failOn: keyof RepositoryHost | undefined;

  readonly #repositories = new Map<string, FakeRepository>();
  readonly #snapshots = new Map<string, Map<string, string>>();
  readonly #botLogin: string;

  public constructor(botLogin = 'cheminfo-bot') {
    this.#botLogin = botLogin;
  }

  public addRepository(
    name: string,
    options: {
      canPush?: boolean;
      defaultBranch?: string;
      files?: Record<string, string>;
    } = {},
  ): void {
    const { canPush = true, defaultBranch = 'main', files = {} } = options;
    const sha = this.#snapshot(new Map(Object.entries(files)));
    this.#repositories.set(name.toLowerCase(), {
      info: { defaultBranch, canPush },
      branches: new Map([[defaultBranch, sha]]),
    });
  }

  public file(name: string, branch: string, path: string): string | undefined {
    const sha = this.#repositories
      .get(name.toLowerCase())
      ?.branches.get(branch);
    return sha === undefined ? undefined : this.#snapshots.get(sha)?.get(path);
  }

  public branches(name: string): string[] {
    return [
      ...(this.#repositories.get(name.toLowerCase())?.branches.keys() ?? []),
    ];
  }

  public closePullRequest(number: number): void {
    for (const pullRequest of this.pullRequests) {
      if (pullRequest.number === number) pullRequest.state = 'closed';
    }
  }

  public async describe(repository: RepositoryName) {
    this.#fail('describe');
    return this.#repositories.get(key(repository))?.info;
  }

  public async readFile(repository: RepositoryName, path: string, ref: string) {
    this.#fail('readFile');
    const sha = this.#repositories.get(key(repository))?.branches.get(ref);
    return sha === undefined ? undefined : this.#snapshots.get(sha)?.get(path);
  }

  public async headOf(repository: RepositoryName, branch: string) {
    this.#fail('headOf');
    const sha = this.#repository(repository).branches.get(branch);
    if (sha === undefined) throw new Error(`no branch ${branch}`);
    return sha;
  }

  public async forkOf(repository: RepositoryName) {
    this.#fail('forkOf');
    const fork = { owner: this.#botLogin, repo: repository.repo };
    if (!this.#repositories.has(key(fork))) {
      const source = this.#repository(repository);
      const { defaultBranch } = source.info;
      this.#repositories.set(key(fork), {
        info: { defaultBranch, canPush: true },
        branches: new Map([
          [defaultBranch, source.branches.get(defaultBranch) ?? ''],
        ]),
      });
      this.forks.push(formatRepository(repository));
    }
    return fork;
  }

  public async createBranch(
    repository: RepositoryName,
    branch: string,
    sha: string,
  ) {
    this.#fail('createBranch');
    const target = this.#repository(repository);
    if (target.branches.has(branch)) throw new Error(`${branch} exists`);
    if (!this.#snapshots.has(sha)) throw new Error(`no commit ${sha}`);
    target.branches.set(branch, sha);
  }

  public async commit(
    repository: RepositoryName,
    branch: string,
    files: FileChange[],
    message: string,
  ) {
    this.#fail('commit');
    const target = this.#repository(repository);
    const snapshot = new Map(
      this.#snapshots.get(target.branches.get(branch) ?? ''),
    );
    for (const file of files) snapshot.set(file.path, file.content);
    target.branches.set(branch, this.#snapshot(snapshot));
    this.commits.push({
      repository: formatRepository(repository),
      branch,
      paths: files.map((file) => file.path),
      message,
    });
  }

  public async openPullRequest(options: OpenPullRequestOptions) {
    this.#fail('openPullRequest');
    const repository = formatRepository(options.repository);
    const number = this.pullRequests.length + 1;
    const url = `https://github.com/${repository}/pull/${number}`;
    this.pullRequests.push({
      repository,
      number,
      url,
      state: 'open',
      head: options.head,
      branch: options.branch,
      base: options.base,
      title: options.title,
      body: options.body,
    });
    return { number, url };
  }

  public async pullRequest(repository: RepositoryName, number: number) {
    this.#fail('pullRequest');
    const name = formatRepository(repository).toLowerCase();
    for (const pullRequest of this.pullRequests) {
      if (
        pullRequest.repository.toLowerCase() === name &&
        pullRequest.number === number
      ) {
        const { url, state, head, branch } = pullRequest;
        return { number, url, state, head, branch };
      }
    }
    return undefined;
  }

  #snapshot(files: Map<string, string>): string {
    const sha = `sha${this.#snapshots.size + 1}`;
    this.#snapshots.set(sha, files);
    return sha;
  }

  #repository(repository: RepositoryName): FakeRepository {
    const found = this.#repositories.get(key(repository));
    if (found === undefined) throw new Error('no such repository');
    return found;
  }

  #fail(operation: keyof RepositoryHost): void {
    if (this.failOn === operation) {
      throw Object.assign(new Error(`GitHub failed on ${operation}`), {
        status: 500,
      });
    }
  }
}

function key(repository: RepositoryName): string {
  return formatRepository(repository).toLowerCase();
}
