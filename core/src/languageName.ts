/**
 * The name of a language, e.g. `French` for `fr`.
 * @param locale - The locale to name.
 * @param displayLocale - The language the name is written in.
 * @returns The name, or the tag itself when the runtime cannot name it.
 */
export function languageName(locale: string, displayLocale = 'en'): string {
  try {
    return (
      new Intl.DisplayNames([displayLocale], { type: 'language' }).of(locale) ??
      locale
    );
  } catch {
    return locale;
  }
}
