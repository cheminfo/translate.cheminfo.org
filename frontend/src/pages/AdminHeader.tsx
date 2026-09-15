import { AnchorButton, Tag } from '@blueprintjs/core';
import type { ReactElement } from 'react';

import { useSiteT } from '../catalog.ts';

/**
 * The admin header: the site's address, which is a name and never translated,
 * and a link to the API documentation.
 * @returns The header.
 */
export function AdminHeader(): ReactElement {
  const t = useSiteT();
  return (
    <header className="app-header">
      <h1 className="app-header-title">
        <span translate="no">translate.cheminfo.org</span>
        <Tag minimal intent="warning">
          {t('header.admin')}
        </Tag>
      </h1>
      <AnchorButton
        variant="minimal"
        icon="code"
        text={t('header.api')}
        href="/docs"
      />
    </header>
  );
}
