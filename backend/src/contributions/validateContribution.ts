import type {
  Contribution,
  ContributionProblem,
  Messages,
} from 'react-cheminfo/translate';
import {
  SOURCE_LOCALE,
  catalogFile,
  checkTranslation,
  isCatalogDirectory,
  isLanguageTag,
  ownMessage,
  parseMessages,
} from 'react-cheminfo/translate';

import type {
  RepositoryHost,
  RepositoryInfo,
  RepositoryName,
} from '../github/RepositoryHost.ts';
import {
  formatRepository,
  isRepositoryAllowed,
  parseRepositoryName,
} from '../utils/repositoryName.ts';

/** A catalog whose every message passed. */
export interface ValidatedCatalog {
  /** The catalog directory. */
  directory: string;
  /** The English messages, as read from the default branch. */
  source: Messages;
  /** The translated messages. */
  messages: Messages;
}

/** A repository, and the catalogs of the contribution that live in it. */
export interface ValidatedRepository {
  /** The repository. */
  repository: RepositoryName;
  /** Its default branch and whether the bot may push to it. */
  info: RepositoryInfo;
  /** The catalogs. */
  catalogs: ValidatedCatalog[];
}

/** What checking a contribution needs. */
export interface ValidationSettings {
  /** Where the repositories are read from. */
  host: RepositoryHost;
  /** The repositories pull requests may be opened on. */
  allowedRepositories: readonly string[];
}

/**
 * Check a whole contribution against the repositories before anything is
 * written: the locale, every repository and directory, and every message
 * against the English one on the default branch.
 * @param contribution - What the overlay sent.
 * @param settings - Where to read and what is allowed.
 * @returns The repositories to publish to, and every problem found.
 */
export async function validateContribution(
  contribution: Contribution,
  settings: ValidationSettings,
): Promise<{
  repositories: ValidatedRepository[];
  problems: ContributionProblem[];
}> {
  const problems: ContributionProblem[] = [];
  const { locale } = contribution;
  if (!isLanguageTag(locale) || locale === SOURCE_LOCALE) {
    problems.push({
      repository: '',
      directory: '',
      message: `"${locale}" is not a locale a translation can be written in.`,
    });
    return { repositories: [], problems };
  }

  const groups = groupByRepository(contribution, settings, problems);
  const repositories: ValidatedRepository[] = [];

  /* eslint-disable no-await-in-loop -- one repository after another keeps the GitHub API calls sequential */
  for (const group of groups.values()) {
    const name = formatRepository(group.repository);
    const info = await settings.host.describe(group.repository);
    if (info === undefined) {
      problems.push({
        repository: name,
        directory: '',
        message: 'The repository does not exist or is not public.',
      });
      continue;
    }

    const catalogs: ValidatedCatalog[] = [];
    for (const catalog of group.catalogs) {
      const report = (message: string, key?: string) => {
        problems.push({
          repository: name,
          directory: catalog.directory,
          ...(key === undefined ? {} : { key }),
          message,
        });
      };

      const path = catalogFile(catalog.directory, SOURCE_LOCALE);
      const text = await settings.host.readFile(
        group.repository,
        path,
        info.defaultBranch,
      );
      if (text === undefined) {
        report(`There is no ${path} on ${info.defaultBranch}.`);
        continue;
      }
      let source: Messages;
      try {
        source = parseMessages(text);
      } catch {
        report(`${path} is not a flat JSON object of strings.`);
        continue;
      }

      let valid = true;
      for (const [key, message] of Object.entries(catalog.messages)) {
        const english = ownMessage(source, key);
        if (english === undefined) {
          report('The English catalog has no such message.', key);
          valid = false;
          continue;
        }
        for (const problem of checkTranslation(english, message)) {
          report(problem.message, key);
          valid = false;
        }
      }
      if (valid) {
        catalogs.push({
          directory: catalog.directory,
          source,
          messages: catalog.messages,
        });
      }
    }
    repositories.push({ repository: group.repository, info, catalogs });
  }
  /* eslint-enable no-await-in-loop */

  return { repositories, problems };
}

interface RepositoryGroup {
  repository: RepositoryName;
  catalogs: Contribution['catalogs'];
}

function groupByRepository(
  contribution: Contribution,
  settings: ValidationSettings,
  problems: ContributionProblem[],
): Map<string, RepositoryGroup> {
  const groups = new Map<string, RepositoryGroup>();
  const seen = new Set<string>();
  for (const catalog of contribution.catalogs) {
    const report = (message: string) => {
      problems.push({
        repository: catalog.repository,
        directory: catalog.directory,
        message,
      });
    };
    const repository = parseRepositoryName(catalog.repository);
    if (repository === undefined) {
      report('The repository must be written owner/repo.');
      continue;
    }
    if (!isRepositoryAllowed(repository, settings.allowedRepositories)) {
      report('This server does not open pull requests on that repository.');
      continue;
    }
    if (!isCatalogDirectory(catalog.directory)) {
      report('A catalog directory is a relative path ending in "locales".');
      continue;
    }
    const name = formatRepository(repository).toLowerCase();
    const id = `${name}\n${catalog.directory}`;
    if (seen.has(id)) {
      report('The same catalog is sent twice.');
      continue;
    }
    seen.add(id);
    const group = groups.get(name) ?? { repository, catalogs: [] };
    group.catalogs.push(catalog);
    groups.set(name, group);
  }
  return groups;
}
