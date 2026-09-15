import { createContext, use } from 'react';
import type { MessageValues, TranslateSession } from 'translate-core';

/** What the provider hands down: the session, and its draft version. */
export interface I18nContextValue {
  /** Formats every message on the page. */
  session: TranslateSession;
  /** Changes whenever a draft does, so every reader re-renders. */
  version: number;
}

export const I18nContext = createContext<I18nContextValue | null>(null);

/**
 * The function that formats the messages of one catalog.
 *
 * It is meant to be called while rendering, never kept in a module constant:
 * in translate mode a message changes as it is typed, and only a render picks
 * that up.
 * @param catalogId - The catalog, as the provider registered it.
 * @returns `t(key, values)`, returning the text to show.
 * @throws {Error} When used outside an `I18nProvider`.
 */
export function useT(
  catalogId: string,
): (key: string, values?: MessageValues) => string {
  const context = use(I18nContext);
  if (context === null) {
    throw new Error('useT must be used inside an I18nProvider');
  }
  const { session } = context;
  return (key, values) => session.format(catalogId, key, values);
}
