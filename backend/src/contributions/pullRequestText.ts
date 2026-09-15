/**
 * The words a translation arrives in: the branch, the commit message, and the
 * title and description of the pull request.
 */

import { languageName } from 'translate-core';

/** Every branch the bot creates starts with this. */
export const BRANCH_PREFIX = 'translate/';

/** What one repository's change is made of. */
export interface ChangeSummary {
  /** The locale translated into. */
  locale: string;
  /** How many messages changed, catalog by catalog. */
  catalogs: Array<{ directory: string; count: number }>;
  /**
   * The name the translator gave.
   * @default undefined
   */
  contributor?: string;
  /**
   * The note the translator left for the reviewer.
   * @default undefined
   */
  note?: string;
}

/**
 * The pull request title, a conventional commit subject.
 * @param locale - The locale translated into.
 * @param count - How many messages changed.
 * @returns The title.
 */
export function pullRequestTitle(locale: string, count: number): string {
  const messages = count === 1 ? 'message' : 'messages';
  return `feat(i18n): translate ${count} ${messages} into ${languageName(locale)}`;
}

/**
 * The commit message: the title, and who submitted it.
 * @param summary - The change.
 * @returns The message.
 */
export function commitMessage(summary: ChangeSummary): string {
  const name = oneLine(summary.contributor);
  return `${pullRequestTitle(summary.locale, total(summary))}\n\n${
    name === '' ? 'Submitted anonymously.' : `Submitted by ${name}.`
  }\n`;
}

/**
 * The pull request description. Everything the translator typed is escaped so
 * it cannot mention anyone or inject HTML.
 * @param summary - The change.
 * @returns The Markdown description.
 */
export function pullRequestBody(summary: ChangeSummary): string {
  const { locale, catalogs, contributor, note } = summary;
  const count = total(summary);
  const name = escapeMarkdown(oneLine(contributor));
  const lines = [
    `${count} ${count === 1 ? 'message' : 'messages'} translated into ${languageName(locale)} (\`${locale}\`) with the translate overlay of translate.cheminfo.org.`,
    '',
    name === '' ? 'Submitted anonymously.' : `Submitted by ${name}.`,
  ];
  if (note !== undefined && note.trim() !== '') {
    lines.push('');
    for (const line of note.trim().split(/\r?\n/)) {
      lines.push(line.trim() === '' ? '>' : `> ${escapeMarkdown(line)}`);
    }
  }
  lines.push('', '| Catalog | Messages |', '| --- | ---: |');
  for (const catalog of catalogs) {
    lines.push(`| \`${catalog.directory}\` | ${catalog.count} |`);
  }
  lines.push(
    '',
    'Each message was checked before this pull request was opened: it parses as ICU MessageFormat and uses exactly the placeholders of the English one.',
    '',
  );
  return lines.join('\n');
}

function total(summary: ChangeSummary): number {
  let count = 0;
  for (const catalog of summary.catalogs) count += catalog.count;
  return count;
}

function oneLine(text: string | undefined): string {
  return (text ?? '').replaceAll(/\s+/g, ' ').trim();
}

function escapeMarkdown(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('@', '&#64;');
}
