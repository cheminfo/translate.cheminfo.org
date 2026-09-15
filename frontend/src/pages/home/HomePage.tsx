import {
  AnchorButton,
  Card,
  FormGroup,
  HTMLSelect,
  InputGroup,
} from '@blueprintjs/core';
import type { ReactElement } from 'react';
import { useState } from 'react';
import { CodeBlock } from 'react-cheminfo/ui';
import { languageName } from 'translate-core';

import { CATALOGS, useSiteT } from '../../catalog.ts';
import { TRANSLATE_PARAM } from '../../i18n/readTranslateLocale.ts';

/** The languages offered first; any canonical tag works in the address. */
const SUGGESTED_LOCALES = ['fr', 'de', 'it', 'es', 'pt-BR', 'zh-Hans', 'ja'];

const EMPTY_ADDRESS = 'https://';

const SETUP_EXAMPLE = `import en from './locales/en.json' with { type: 'json' };

const CATALOGS = [
  {
    id: 'smiles.cheminfo.org',
    repository: 'cheminfo/smiles.cheminfo.org',
    directory: 'frontend/src/locales',
    messages: en,
  },
];

function Title() {
  const t = useT('smiles.cheminfo.org');
  return <h1 title={t('title.tooltip')}>{t('title')}</h1>;
}`;

/**
 * Open a site in translate mode, try the overlay here, and read how it works.
 * @returns The page.
 */
export function HomePage(): ReactElement {
  const t = useSiteT();
  const [address, setAddress] = useState(EMPTY_ADDRESS);
  const [locale, setLocale] = useState('fr');
  const target = translateAddress(address, locale);
  const invalid = target === undefined && address !== EMPTY_ADDRESS;

  return (
    <>
      <Card>
        <h2>{t('launch.heading')}</h2>
        <p>{t('launch.intro')}</p>
        <div className="launch-row">
          <FormGroup
            className="launch-address"
            label={t('launch.address')}
            labelFor="launch-address"
            intent={invalid ? 'danger' : 'none'}
            helperText={invalid ? t('launch.invalid') : undefined}
          >
            <InputGroup
              id="launch-address"
              value={address}
              onValueChange={setAddress}
              intent={invalid ? 'danger' : 'none'}
              spellCheck={false}
              autoCapitalize="off"
              autoCorrect="off"
              autoComplete="off"
            />
          </FormGroup>
          <FormGroup label={t('launch.language')} labelFor="launch-language">
            <HTMLSelect
              id="launch-language"
              value={locale}
              onChange={(event) => {
                setLocale(event.currentTarget.value);
              }}
              options={SUGGESTED_LOCALES.map((code) => ({
                value: code,
                label: `${languageName(code)} (${code})`,
              }))}
            />
          </FormGroup>
          <AnchorButton
            intent="primary"
            icon="translate"
            text={t('launch.open')}
            href={target}
            target="_blank"
            rel="noreferrer"
            disabled={target === undefined}
          />
        </div>
      </Card>

      <Card>
        <h2>{t('try.heading')}</h2>
        <p>{t('try.intro')}</p>
        <AnchorButton
          icon="translate"
          text={t('try.open', { language: languageName('fr') })}
          href={`?${TRANSLATE_PARAM}=fr`}
        />
      </Card>

      <Card>
        <h2>{t('how.heading')}</h2>
        <ol>
          <li>{t('how.marker')}</li>
          <li>{t('how.check')}</li>
          <li>{t('how.pullRequest')}</li>
        </ol>
        <p className="muted">{t('how.count', { count: CATALOGS.length })}</p>
      </Card>

      <Card>
        <h2>{t('setup.heading')}</h2>
        <p>{t('setup.intro')}</p>
        <div translate="no">
          <CodeBlock code={SETUP_EXAMPLE} tone="muted" />
        </div>
      </Card>
    </>
  );
}

function translateAddress(address: string, locale: string): string | undefined {
  let url: URL;
  try {
    url = new URL(address.trim());
  } catch {
    return undefined;
  }
  const local = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
  if (url.protocol !== 'https:' && !local) return undefined;
  url.searchParams.set(TRANSLATE_PARAM, locale);
  return url.href;
}
