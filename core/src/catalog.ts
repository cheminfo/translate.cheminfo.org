/**
 * The shape of the messages a site or a library owns, and where they are kept.
 *
 * A catalog is one directory of a repository holding `en.json`, the source of
 * truth, and one flat file per locale beside it. The site registers each of
 * its catalogs with the repository and the directory, so a translation made
 * anywhere on the page can be sent back to the file it belongs to.
 */

/** Messages by key; every value is an ICU MessageFormat string. */
export type Messages = Record<string, string>;

/** The locale every catalog is written in first. */
export const SOURCE_LOCALE = 'en';

/** One catalog a page renders messages from. */
export interface CatalogSource {
  /**
   * The name the page knows the catalog by, unique on the page, e.g.
   * `translate.cheminfo.org` or `react-cheminfo/share`.
   */
  id: string;
  /** The GitHub repository the files live in, written `owner/repo`. */
  repository: string;
  /**
   * The directory holding `en.json` and the locale files, relative to the
   * repository root, e.g. `frontend/src/locales`.
   */
  directory: string;
  /** The English messages. */
  messages: Messages;
}

/** Which message of which catalog. */
export interface MessageRef {
  /** The catalog, by the id the page registered it under. */
  catalogId: string;
  /** The key of the message in that catalog. */
  key: string;
}

const DIRECTORY_SEGMENT = /^[\w-][\w.-]*$/;

/**
 * The message a catalog holds under a key, never one inherited from
 * `Object.prototype`: a key like `constructor` is only a message when the
 * catalog defines it.
 * @param messages - The catalog's messages.
 * @param key - The key asked for.
 * @returns The message, or `undefined` when the catalog has none.
 */
export function ownMessage(
  messages: Messages,
  key: string,
): string | undefined {
  return Object.hasOwn(messages, key) ? messages[key] : undefined;
}

/**
 * Whether a string is a locale a catalog file can be named after: a BCP 47
 * tag already written in its canonical form, e.g. `fr`, `pt-BR`, `zh-Hant`.
 * @param value - The candidate tag.
 * @returns True when the tag is valid and canonical.
 */
export function isLocale(value: string): boolean {
  if (value.length === 0 || value.length > 35) return false;
  try {
    return Intl.getCanonicalLocales(value)[0] === value;
  } catch {
    return false;
  }
}

/**
 * Whether a path can name a catalog directory: relative, without `.` or `..`
 * segments, and ending in a directory called `locales`. The server only ever
 * writes inside such a directory.
 * @param value - The candidate path, e.g. `frontend/src/locales`.
 * @returns True when the path is acceptable.
 */
export function isCatalogDirectory(value: string): boolean {
  const segments = value.split('/');
  if (segments.at(-1) !== 'locales') return false;
  for (const segment of segments) {
    if (!DIRECTORY_SEGMENT.test(segment)) return false;
  }
  return true;
}

/**
 * The file a catalog keeps one locale's messages in.
 * @param directory - The catalog directory.
 * @param locale - The locale.
 * @returns The path, relative to the repository root.
 */
export function catalogFile(directory: string, locale: string): string {
  return `${directory}/${locale}.json`;
}
