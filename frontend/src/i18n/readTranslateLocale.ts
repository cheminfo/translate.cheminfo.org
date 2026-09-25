import { SOURCE_LOCALE, isLanguageTag } from 'react-cheminfo/translate';

/** The query parameter that opens a page in translate mode. */
export const TRANSLATE_PARAM = 'translate';

/**
 * The locale a page is being translated into, from its address:
 * `?translate=fr` opens the overlay for French.
 * @param search - The query string, e.g. `location.search`.
 * @returns The locale, or `undefined` when the page is not in translate mode
 * or names something that is not a locale other than English.
 */
export function readTranslateLocale(search: string): string | undefined {
  const value = new URLSearchParams(search).get(TRANSLATE_PARAM);
  if (value === null || value === SOURCE_LOCALE || !isLanguageTag(value)) {
    return undefined;
  }
  return value;
}
