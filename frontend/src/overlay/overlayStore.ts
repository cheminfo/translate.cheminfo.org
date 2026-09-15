import { persistBucket } from 'react-cheminfo/core';
import type {
  CatalogSnapshot,
  ContributionResult,
  Messages,
  TranslateBridge,
} from 'translate-core';

/** What the overlay keeps in the browser of the site it runs on. */
export interface StoredOverlay {
  /** Edits not yet cleared, by locale then catalog id. */
  drafts: Record<string, Record<string, Messages>>;
  /** Continuation tokens, one per repository. */
  continuations: string[];
  /** The name the translator last submitted under. */
  contributor: string;
}

const bucket = persistBucket<StoredOverlay>({
  key: 'cheminfo-translate:overlay',
  defaults: { drafts: {}, continuations: [], contributor: '' },
});

/**
 * What is stored.
 * @returns The stored state, merged over the defaults.
 */
export function readStored(): StoredOverlay {
  return bucket.read().value;
}

/**
 * Replace what is stored.
 * @param value - The new state.
 */
export function writeStored(value: StoredOverlay): void {
  bucket.write(value);
}

/**
 * Put the edits stored for the page's locale back on the page. Edits for keys
 * the page no longer has are ignored by the bridge.
 * @param bridge - The page.
 */
export function restoreDrafts(bridge: TranslateBridge): void {
  const catalogs = readStored().drafts[bridge.locale] ?? {};
  for (const [catalogId, messages] of Object.entries(catalogs)) {
    for (const [key, message] of Object.entries(messages)) {
      bridge.setDraft({ catalogId, key }, message);
    }
  }
}

/**
 * Store the edits of the page's catalogs for a locale.
 * @param locale - The locale.
 * @param catalogs - The catalogs, with their drafts.
 */
export function storeDrafts(
  locale: string,
  catalogs: readonly CatalogSnapshot[],
): void {
  const stored = readStored();
  const drafts: Record<string, Messages> = {};
  for (const catalog of catalogs) {
    if (Object.keys(catalog.drafts).length > 0) {
      drafts[catalog.id] = catalog.drafts;
    }
  }
  writeStored({ ...stored, drafts: { ...stored.drafts, [locale]: drafts } });
}

/**
 * Keep one continuation token per repository, the latest one.
 * @param previous - The tokens stored so far.
 * @param result - What the last submission answered.
 * @returns The tokens to store.
 */
export function mergeContinuations(
  previous: readonly string[],
  result: ContributionResult,
): string[] {
  const byRepository = new Map<string, string>();
  for (const token of previous) byRepository.set(repositoryOf(token), token);
  for (const pullRequest of result.pullRequests) {
    byRepository.set(
      pullRequest.repository.toLowerCase(),
      pullRequest.continuation,
    );
  }
  return [...byRepository.values()];
}

function repositoryOf(token: string): string {
  return token.slice(0, Math.max(0, token.indexOf('#'))).toLowerCase();
}
