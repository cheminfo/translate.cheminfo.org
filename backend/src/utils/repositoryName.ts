import type { RepositoryName } from '../github/RepositoryHost.ts';

const OWNER = /^[A-Za-z\d](?:[A-Za-z\d-]{0,38})$/;
const REPO = /^[\w.-]{1,100}$/;

/**
 * Read an `owner/repo` string.
 * @param value - The repository as a catalog names it.
 * @returns The repository, or `undefined` when the string is not one.
 */
export function parseRepositoryName(value: string): RepositoryName | undefined {
  const parts = value.split('/');
  if (parts.length !== 2) return undefined;
  const [owner = '', repo = ''] = parts;
  if (!OWNER.test(owner) || !REPO.test(repo)) return undefined;
  if (repo === '.' || repo === '..') return undefined;
  return { owner, repo };
}

/**
 * Write a repository as `owner/repo`.
 * @param repository - The repository.
 * @returns The string GitHub names it by.
 */
export function formatRepository(repository: RepositoryName): string {
  return `${repository.owner}/${repository.repo}`;
}

/**
 * Read the list of repositories pull requests may be opened on.
 * @param value - Comma separated `owner/repo` or `owner/*` patterns.
 * @returns The patterns, blanks dropped.
 */
export function parseAllowedRepositories(value: string): string[] {
  const patterns: string[] = [];
  for (const part of value.split(',')) {
    const pattern = part.trim();
    if (pattern !== '') patterns.push(pattern);
  }
  return patterns;
}

/**
 * Whether a repository matches one of the allowed patterns. GitHub names are
 * case-insensitive, and so is the match.
 * @param repository - The repository a catalog names.
 * @param patterns - `owner/repo`, or `owner/*` for every repository of owner.
 * @returns True when one pattern matches.
 */
export function isRepositoryAllowed(
  repository: RepositoryName,
  patterns: readonly string[],
): boolean {
  const owner = repository.owner.toLowerCase();
  const name = formatRepository(repository).toLowerCase();
  for (const pattern of patterns) {
    const lowered = pattern.toLowerCase();
    if (lowered === name || lowered === `${owner}/*`) return true;
  }
  return false;
}
