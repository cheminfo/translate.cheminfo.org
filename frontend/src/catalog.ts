/**
 * The messages of this admin page, registered like any site registers its
 * own: the page is translatable, which is how the overlay is tried here.
 */

import type { CatalogSource, MessageValues, Messages } from 'translate-core';

import { useT } from './i18n/I18nContext.ts';
import en from './locales/en.json' with { type: 'json' };

/** The name this page knows its catalog by. */
export const SITE_CATALOG_ID = 'translate.cheminfo.org';

/** Every key the English catalog defines. */
export type SiteMessageKey = keyof typeof en;

/** The catalogs the page renders from. */
export const CATALOGS: readonly CatalogSource[] = [
  {
    id: SITE_CATALOG_ID,
    repository: 'cheminfo/translate.cheminfo.org',
    directory: 'frontend/src/locales',
    messages: en,
  },
];

const TRANSLATION_FILES = import.meta.glob<Messages>(
  ['./locales/*.json', '!./locales/en.json'],
  { import: 'default' },
);

/**
 * The published messages of a locale.
 * @param locale - The locale being translated into.
 * @returns The messages by catalog id; empty when none are published yet.
 */
export async function loadTranslations(
  locale: string,
): Promise<Record<string, Messages>> {
  const load = TRANSLATION_FILES[`./locales/${locale}.json`];
  if (load === undefined) return {};
  return { [SITE_CATALOG_ID]: await load() };
}

/**
 * The formatter of this page's messages, typed by the English catalog.
 * @returns `t(key, values)`.
 */
export function useSiteT(): (
  key: SiteMessageKey,
  values?: MessageValues,
) => string {
  return useT(SITE_CATALOG_ID);
}
