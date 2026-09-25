import { sanitizeFileName } from 'react-cheminfo/core';
import type {
  CatalogSnapshot,
  Contribution,
  Messages,
} from 'react-cheminfo/translate';
import {
  checkTranslation,
  mergeMessages,
  ownMessage,
  serializeMessages,
} from 'react-cheminfo/translate';

/** A catalog's edits, sorted into what can be sent and what cannot. */
export interface PendingCatalog {
  /** The catalog. */
  catalog: CatalogSnapshot;
  /** Edits that pass their check. */
  valid: Messages;
  /** Keys of the edits that do not. */
  invalidKeys: string[];
}

/**
 * The edits of every catalog that has some.
 * @param catalogs - The catalogs, with their drafts.
 * @returns One entry per catalog holding at least one edit.
 */
export function pendingChanges(
  catalogs: readonly CatalogSnapshot[],
): PendingCatalog[] {
  const pending: PendingCatalog[] = [];
  for (const catalog of catalogs) {
    const valid: Array<[string, string]> = [];
    const invalidKeys: string[] = [];
    for (const [key, draft] of Object.entries(catalog.drafts)) {
      const source = ownMessage(catalog.messages, key) ?? '';
      if (checkTranslation(source, draft).length === 0) {
        valid.push([key, draft]);
      } else {
        invalidKeys.push(key);
      }
    }
    if (valid.length > 0 || invalidKeys.length > 0) {
      pending.push({ catalog, valid: Object.fromEntries(valid), invalidKeys });
    }
  }
  return pending;
}

/**
 * How many edits can be sent, and how many cannot yet.
 * @param pending - The pending catalogs.
 * @returns The two counts.
 */
export function pendingCounts(pending: readonly PendingCatalog[]): {
  valid: number;
  invalid: number;
} {
  let valid = 0;
  let invalid = 0;
  for (const entry of pending) {
    valid += Object.keys(entry.valid).length;
    invalid += entry.invalidKeys.length;
  }
  return { valid, invalid };
}

/** Who submits, and what they say; blank values are left out. */
export interface SubmissionDetails {
  /** The name to credit. */
  contributor: string;
  /** The note for the reviewer. */
  note: string;
  /** Tokens of pull requests this browser opened before. */
  continuations: string[];
}

/**
 * The contribution the server receives: every edit that passes its check.
 * @param locale - The locale translated into.
 * @param pending - The pending catalogs.
 * @param details - Who submits.
 * @returns The contribution.
 */
export function buildContribution(
  locale: string,
  pending: readonly PendingCatalog[],
  details: SubmissionDetails,
): Contribution {
  const contribution: Contribution = { locale, catalogs: [] };
  for (const { catalog, valid } of pending) {
    if (Object.keys(valid).length === 0) continue;
    contribution.catalogs.push({
      repository: catalog.repository,
      directory: catalog.directory,
      messages: valid,
    });
  }
  const contributor = details.contributor.trim();
  const note = details.note.trim();
  if (contributor !== '') contribution.contributor = contributor;
  if (note !== '') contribution.note = note;
  if (details.continuations.length > 0) {
    contribution.continuations = details.continuations;
  }
  return contribution;
}

/**
 * The locale files as they would be with the edits merged in, for a
 * translator who sends them by hand.
 * @param locale - The locale translated into.
 * @param pending - The pending catalogs.
 * @returns One file per catalog with usable edits.
 */
export function translationFiles(
  locale: string,
  pending: readonly PendingCatalog[],
): Array<{ fileName: string; content: string }> {
  const files: Array<{ fileName: string; content: string }> = [];
  for (const { catalog, valid } of pending) {
    if (Object.keys(valid).length === 0) continue;
    files.push({
      fileName: `${sanitizeFileName(catalog.id)}.${locale}.json`,
      content: serializeMessages(
        mergeMessages(catalog.messages, catalog.translation, valid),
      ),
    });
  }
  return files;
}
