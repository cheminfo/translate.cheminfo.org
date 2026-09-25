import type { CatalogSnapshot } from 'react-cheminfo/translate';
import { expect, test } from 'vitest';

import {
  buildContribution,
  pendingChanges,
  pendingCounts,
  translationFiles,
} from '../pendingChanges.ts';

const CATALOG: CatalogSnapshot = {
  id: 'site',
  repository: 'cheminfo/site',
  directory: 'src/locales',
  messages: {
    title: 'Periodic table',
    count: '{count} elements',
    close: 'Close',
  },
  translation: { title: 'Tableau périodique' },
  drafts: { count: '{count} éléments', close: '{broken' },
};

const UNTOUCHED: CatalogSnapshot = { ...CATALOG, id: 'other', drafts: {} };

test('edits are sorted into those that can be sent and those that cannot', () => {
  const pending = pendingChanges([CATALOG, UNTOUCHED]);
  expect(pending).toStrictEqual([
    {
      catalog: CATALOG,
      valid: { count: '{count} éléments' },
      invalidKeys: ['close'],
    },
  ]);
  expect(pendingCounts(pending)).toStrictEqual({ valid: 1, invalid: 1 });
});

test('the contribution carries the usable edits, and leaves blank details out', () => {
  const pending = pendingChanges([CATALOG]);
  expect(
    buildContribution('fr', pending, {
      contributor: '  Ada ',
      note: '  ',
      continuations: ['token'],
    }),
  ).toStrictEqual({
    locale: 'fr',
    catalogs: [
      {
        repository: 'cheminfo/site',
        directory: 'src/locales',
        messages: { count: '{count} éléments' },
      },
    ],
    contributor: 'Ada',
    continuations: ['token'],
  });
  expect(
    buildContribution('fr', pending, {
      contributor: '',
      note: 'Check the plural',
      continuations: [],
    }),
  ).toStrictEqual({
    locale: 'fr',
    catalogs: [
      {
        repository: 'cheminfo/site',
        directory: 'src/locales',
        messages: { count: '{count} éléments' },
      },
    ],
    note: 'Check the plural',
  });
});

test('a downloaded file is the published translation with the edits merged in', () => {
  expect(translationFiles('fr', pendingChanges([CATALOG]))).toStrictEqual([
    {
      fileName: 'site.fr.json',
      content:
        '{\n  "title": "Tableau périodique",\n  "count": "{count} éléments"\n}\n',
    },
  ]);
});
