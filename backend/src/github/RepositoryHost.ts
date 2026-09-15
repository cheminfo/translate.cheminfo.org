/**
 * What publishing a translation needs from GitHub, and nothing more.
 *
 * The contribution flow is written against this interface so it is tested
 * against an in-memory host; `OctokitHost` is the implementation that talks to
 * the GitHub REST API.
 */

/** A repository, by owner and name. */
export interface RepositoryName {
  /** The user or organisation. */
  owner: string;
  /** The repository name. */
  repo: string;
}

/** What is known of a repository before writing to it. */
export interface RepositoryInfo {
  /** The branch pull requests target. */
  defaultBranch: string;
  /** Whether the bot may push a branch to it, or must work from a fork. */
  canPush: boolean;
}

/** A pull request the bot opened. */
export interface PullRequestInfo {
  /** Its number. */
  number: number;
  /** Where to read it. */
  url: string;
  /** Whether it can still receive commits. */
  state: 'open' | 'closed';
  /** The repository its branch lives in: the target, or the bot's fork. */
  head: RepositoryName;
  /** The branch it was opened from. */
  branch: string;
}

/** One file written by a commit. */
export interface FileChange {
  /** The path, relative to the repository root. */
  path: string;
  /** The whole new content, UTF-8. */
  content: string;
}

/** What opening a pull request needs. */
export interface OpenPullRequestOptions {
  /** The repository the pull request is opened on. */
  repository: RepositoryName;
  /** The branch it targets. */
  base: string;
  /** The repository the branch lives in. */
  head: RepositoryName;
  /** The branch holding the change. */
  branch: string;
  /** The title. */
  title: string;
  /** The description, Markdown. */
  body: string;
}

/** The GitHub operations the contribution flow uses. */
export interface RepositoryHost {
  /** Default branch and push access; `undefined` when not found. */
  describe: (repository: RepositoryName) => Promise<RepositoryInfo | undefined>;
  /** A file's content at a ref; `undefined` when it does not exist. */
  readFile: (
    repository: RepositoryName,
    path: string,
    ref: string,
  ) => Promise<string | undefined>;
  /** The commit a branch points at. */
  headOf: (repository: RepositoryName, branch: string) => Promise<string>;
  /** The bot's fork of a repository, created when it has none yet. */
  forkOf: (repository: RepositoryName) => Promise<RepositoryName>;
  /** Create a branch at a commit. */
  createBranch: (
    repository: RepositoryName,
    branch: string,
    sha: string,
  ) => Promise<void>;
  /** Commit files on top of a branch, as one commit. */
  commit: (
    repository: RepositoryName,
    branch: string,
    files: FileChange[],
    message: string,
  ) => Promise<void>;
  /** Open a pull request. */
  openPullRequest: (
    options: OpenPullRequestOptions,
  ) => Promise<{ number: number; url: string }>;
  /** A pull request by number; `undefined` when not found. */
  pullRequest: (
    repository: RepositoryName,
    number: number,
  ) => Promise<PullRequestInfo | undefined>;
}
