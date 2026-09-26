// @vitest-environment happy-dom

import type {
  CatalogSnapshot,
  MessageRef,
  TranslateBridge,
} from 'react-cheminfo/translate';
import { expect, test } from 'vitest';

import {
  readStored,
  restoreDrafts,
  storeDrafts,
  writeStored,
} from '../overlayStore.ts';

const CATALOG: CatalogSnapshot = {
  id: 'site',
  repository: 'cheminfo/site',
  directory: 'src/locales',
  messages: { 'a.name': 'Iron', 'b.name': 'Gold' },
  translation: {},
  drafts: { 'a.name': 'Fer' },
};

/** A page that only remembers what the overlay set on it. */
function fakeBridge(locale: string) {
  const set: Array<{ ref: MessageRef; message: string | undefined }> = [];
  return {
    locale,
    set,
    setDraft: (ref: MessageRef, message: string | undefined) => {
      set.push({ ref, message });
    },
  };
}

test('what is stored starts empty', () => {
  writeStored({ drafts: {}, continuations: [], contributor: '' });
  expect(readStored()).toStrictEqual({
    drafts: {},
    continuations: [],
    contributor: '',
  });
});

test('the edits of a locale are kept under it, catalog by catalog', () => {
  writeStored({ drafts: {}, continuations: [], contributor: 'Ada' });
  storeDrafts('fr', [CATALOG]);

  const stored = readStored();
  expect(stored.drafts).toStrictEqual({ fr: { site: { 'a.name': 'Fer' } } });
  // What else was stored is left alone.
  expect(stored.contributor).toBe('Ada');
});

test('a catalog nobody edited takes no room', () => {
  writeStored({ drafts: {}, continuations: [], contributor: '' });
  storeDrafts('fr', [{ ...CATALOG, drafts: {} }]);
  expect(readStored().drafts).toStrictEqual({ fr: {} });
});

test('a second locale does not take the first one away', () => {
  writeStored({ drafts: {}, continuations: [], contributor: '' });
  storeDrafts('fr', [CATALOG]);
  storeDrafts('de', [{ ...CATALOG, drafts: { 'b.name': 'Gold' } }]);

  expect(Object.keys(readStored().drafts)).toStrictEqual(['fr', 'de']);
});

test('coming back puts the edits of this locale on the page, and no other', () => {
  writeStored({
    drafts: {
      fr: { site: { 'a.name': 'Fer' } },
      de: { site: { 'a.name': 'Eisen' } },
    },
    continuations: [],
    contributor: '',
  });

  const bridge = fakeBridge('fr');
  restoreDrafts(bridge as unknown as TranslateBridge);
  expect(bridge.set).toStrictEqual([
    { ref: { catalogId: 'site', key: 'a.name' }, message: 'Fer' },
  ]);
});

test('a locale nobody has edited restores nothing', () => {
  writeStored({ drafts: {}, continuations: [], contributor: '' });
  const bridge = fakeBridge('it');
  restoreDrafts(bridge as unknown as TranslateBridge);
  expect(bridge.set).toStrictEqual([]);
});
