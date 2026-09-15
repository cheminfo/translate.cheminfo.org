import type { ReactElement, ReactNode } from 'react';
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from 'react';
import type { CatalogSource, Messages, TranslateBridge } from 'translate-core';
import { BRIDGE_GLOBAL, SOURCE_LOCALE, TranslateSession } from 'translate-core';

import { I18nContext } from './I18nContext.ts';
import { readTranslateLocale } from './readTranslateLocale.ts';

export interface I18nProviderProps {
  /** Every catalog the page renders messages from. */
  catalogs: readonly CatalogSource[];
  /** The published messages of a locale, by catalog id. */
  loadTranslations: (locale: string) => Promise<Record<string, Messages>>;
  /** Mount the overlay once the page is in translate mode. */
  startOverlay: (bridge: TranslateBridge) => void | Promise<void>;
  /** The page. */
  children: ReactNode;
}

/**
 * Formats the page's messages, and turns the page into a translatable one when
 * its address carries `?translate=<locale>`: the published translation is
 * loaded, every message is marked, the session is exposed to the overlay as
 * `window.__cheminfoTranslate`, and the overlay is started.
 * @param props - The catalogs, how to load translations and the overlay.
 * @returns The provider.
 */
export function I18nProvider(props: I18nProviderProps): ReactElement {
  const { catalogs, loadTranslations, startOverlay, children } = props;
  const [session, setSession] = useState(
    () => new TranslateSession({ locale: SOURCE_LOCALE, catalogs }),
  );

  useEffect(() => {
    const locale = readTranslateLocale(globalThis.location.search);
    if (locale === undefined) return;
    let cancelled = false;
    void loadTranslations(locale).then((translations) => {
      if (cancelled) return;
      const translating = new TranslateSession({
        locale,
        catalogs,
        translations,
        marked: true,
      });
      Object.assign(globalThis, { [BRIDGE_GLOBAL]: translating });
      setSession(translating);
      return startOverlay(translating);
    });
    return () => {
      cancelled = true;
    };
  }, [catalogs, loadTranslations, startOverlay]);

  const subscribe = useCallback(
    (listener: () => void) => session.subscribe(listener),
    [session],
  );
  const version = useSyncExternalStore(subscribe, () => session.version);
  const value = useMemo(() => ({ session, version }), [session, version]);

  return <I18nContext value={value}>{children}</I18nContext>;
}
