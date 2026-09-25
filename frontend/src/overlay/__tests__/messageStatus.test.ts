import type { CatalogSnapshot } from 'react-cheminfo/translate';
import { expect, test } from 'vitest';

import {
  catalogProgress,
  messageStatus,
  worstStatus,
} from '../messageStatus.ts';

const CATALOG: CatalogSnapshot = {
  id: 'site',
  repository: 'cheminfo/site',
  directory: 'src/locales',
  messages: {
    title: 'Title',
    count: '{count} items',
    close: 'Close',
    help: 'Help',
  },
  translation: { title: 'Titre', close: 'Fermer' },
  drafts: { count: '{count} éléments', close: 'Fermer {extra}' },
};

test('a message is translated, edited, invalid or missing', () => {
  expect(messageStatus(CATALOG, 'title')).toBe('translated');
  expect(messageStatus(CATALOG, 'count')).toBe('draft');
  expect(messageStatus(CATALOG, 'close')).toBe('invalid');
  expect(messageStatus(CATALOG, 'help')).toBe('missing');
});

test('the most pressing status wins', () => {
  expect(worstStatus([])).toBe('translated');
  expect(worstStatus(['translated', 'draft'])).toBe('draft');
  expect(worstStatus(['draft', 'missing', 'translated'])).toBe('missing');
  expect(worstStatus(['missing', 'invalid'])).toBe('invalid');
});

test('progress counts a usable edit as translated', () => {
  expect(catalogProgress(CATALOG)).toStrictEqual({
    total: 4,
    translated: 2,
    edited: 2,
    invalid: 1,
  });
});
