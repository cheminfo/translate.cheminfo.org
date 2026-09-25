/**
 * The admin page: a header, and the page that opens sites in translate mode.
 *
 * It is not a site of the family — no registry record, no About, Cite, Tools or
 * Share — because nothing links here.
 */

import type { ReactElement } from 'react';
import type { TranslateBridge } from 'react-cheminfo/translate';

import { CATALOGS, loadTranslations } from './catalog.ts';
import { I18nProvider } from './i18n/I18nProvider.tsx';
import { AdminHeader } from './pages/AdminHeader.tsx';
import { HomePage } from './pages/home/HomePage.tsx';

/**
 * The whole application.
 * @returns The shell.
 */
export default function App(): ReactElement {
  return (
    <I18nProvider
      catalogs={CATALOGS}
      loadTranslations={loadTranslations}
      startOverlay={startOverlay}
    >
      <div className="app-screen">
        <AdminHeader />
        <main className="app-main">
          <HomePage />
        </main>
      </div>
    </I18nProvider>
  );
}

async function startOverlay(bridge: TranslateBridge): Promise<void> {
  const { mountOverlay } = await import('./overlay/mountOverlay.tsx');
  mountOverlay(bridge, { apiOrigin: globalThis.location.origin });
}
