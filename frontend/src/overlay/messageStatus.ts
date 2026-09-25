import type { CatalogSnapshot } from 'react-cheminfo/translate';
import { checkTranslation, ownMessage } from 'react-cheminfo/translate';

/**
 * Where a message stands: edited and usable, edited but failing its check,
 * published, or not translated at all.
 */
export type MessageStatus = 'invalid' | 'missing' | 'draft' | 'translated';

const PRIORITY: Record<MessageStatus, number> = {
  translated: 0,
  draft: 1,
  missing: 2,
  invalid: 3,
};

/**
 * The status of one message of a catalog.
 * @param catalog - The catalog, with its translation and drafts.
 * @param key - The message.
 * @returns Its status.
 */
export function messageStatus(
  catalog: CatalogSnapshot,
  key: string,
): MessageStatus {
  const draft = ownMessage(catalog.drafts, key);
  if (draft !== undefined) {
    const source = ownMessage(catalog.messages, key) ?? '';
    return checkTranslation(source, draft).length === 0 ? 'draft' : 'invalid';
  }
  return ownMessage(catalog.translation, key) === undefined
    ? 'missing'
    : 'translated';
}

/**
 * The most pressing of several statuses: an element showing a missing and a
 * translated message is outlined as missing.
 * @param statuses - The statuses.
 * @returns The one that needs attention first; `translated` when none does.
 */
export function worstStatus(statuses: Iterable<MessageStatus>): MessageStatus {
  let worst: MessageStatus = 'translated';
  for (const status of statuses) {
    if (PRIORITY[status] > PRIORITY[worst]) worst = status;
  }
  return worst;
}

/** How far a catalog's translation has come. */
export interface CatalogProgress {
  /** Messages in the English catalog. */
  total: number;
  /** Messages published or edited into a usable translation. */
  translated: number;
  /** Messages edited in the overlay, usable or not. */
  edited: number;
  /** Edited messages failing their check. */
  invalid: number;
}

/**
 * Count a catalog's messages by status.
 * @param catalog - The catalog.
 * @returns The counts.
 */
export function catalogProgress(catalog: CatalogSnapshot): CatalogProgress {
  const progress: CatalogProgress = {
    total: 0,
    translated: 0,
    edited: 0,
    invalid: 0,
  };
  for (const key of Object.keys(catalog.messages)) {
    progress.total++;
    const status = messageStatus(catalog, key);
    if (status === 'translated' || status === 'draft') progress.translated++;
    if (status === 'draft' || status === 'invalid') progress.edited++;
    if (status === 'invalid') progress.invalid++;
  }
  return progress;
}
