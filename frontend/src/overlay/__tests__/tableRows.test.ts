import type {
  CatalogSnapshot,
  TranslatableTable,
} from 'react-cheminfo/translate';
import { expect, test } from 'vitest';

import {
  filterRows,
  tableProgress,
  tableRowStates,
  translatedPairs,
} from '../tableRows.ts';

const TABLE: TranslatableTable = {
  id: 'element',
  label: 'Elements',
  catalogId: 'site',
  fields: [
    { id: 'name', label: 'Name', required: true },
    { id: 'origin', label: 'Origin', size: 'paragraph' },
  ],
  rows: [
    { id: 'H', label: '1 · H' },
    { id: 'He', label: '2 · He' },
    { id: 'Li', label: '3 · Li' },
  ],
};

const CATALOG: CatalogSnapshot = {
  id: 'site',
  repository: 'cheminfo/site',
  directory: 'src/locales',
  messages: {
    'element.H.name': 'Hydrogen',
    'element.H.origin': "the Greek for 'water-forming'",
    'element.He.name': 'Helium',
    'element.He.origin': "the Greek helios, 'sun'",
    'element.Li.name': 'Lithium',
    // Lithium has no origin in English, so there is nothing to translate.
  },
  translation: {
    'element.H.name': 'Hydrogène',
    'element.He.name': 'Hélium',
    'element.Li.name': 'Lithium',
  },
  drafts: {
    'element.H.origin': "le grec pour 'formeur d'eau'",
  },
};

test('a row carries one cell per written column, in the declared order', () => {
  const rows = tableRowStates(TABLE, CATALOG);

  expect(rows.map((row) => row.id)).toStrictEqual(['H', 'He', 'Li']);
  expect(rows[0]?.cells.map((cell) => cell.key)).toStrictEqual([
    'element.H.name',
    'element.H.origin',
  ]);
  expect(rows[0]?.cells[0]?.source).toBe('Hydrogen');
  expect(rows[0]?.cells[0]?.value).toBe('Hydrogène');
  expect(rows[0]?.cells[0]?.status).toBe('translated');
});

test('an edit is what the box holds, and says it is an edit', () => {
  const cell = tableRowStates(TABLE, CATALOG)[0]?.cells[1];

  expect(cell?.value).toBe("le grec pour 'formeur d'eau'");
  expect(cell?.published).toBeUndefined();
  expect(cell?.status).toBe('draft');
});

test('a column the English does not fill is not a cell to write', () => {
  const lithium = tableRowStates(TABLE, CATALOG)[2];

  expect(lithium?.cells[1]?.source).toBe('');
  expect(lithium?.status).toBe('translated');
});

test('a row is as pressing as its most pressing cell', () => {
  const helium = tableRowStates(TABLE, CATALOG)[1];

  expect(helium?.cells.map((cell) => cell.status)).toStrictEqual([
    'translated',
    'missing',
  ]);
  expect(helium?.status).toBe('missing');
});

test('the filters keep the rows still to write, and the ones written here', () => {
  const rows = tableRowStates(TABLE, CATALOG);

  expect(filterRows(rows, 'all', '').map((row) => row.id)).toStrictEqual([
    'H',
    'He',
    'Li',
  ]);
  expect(filterRows(rows, 'missing', '').map((row) => row.id)).toStrictEqual([
    'He',
  ]);
  expect(filterRows(rows, 'edited', '').map((row) => row.id)).toStrictEqual([
    'H',
  ]);
});

test('a row is found by its name in either language', () => {
  const rows = tableRowStates(TABLE, CATALOG);

  expect(filterRows(rows, 'all', 'helium').map((row) => row.id)).toStrictEqual([
    'He',
  ]);
  expect(
    filterRows(rows, 'all', 'hydrogène').map((row) => row.id),
  ).toStrictEqual(['H']);
  expect(filterRows(rows, 'all', '2 · He').map((row) => row.id)).toStrictEqual([
    'He',
  ]);
  expect(filterRows(rows, 'all', 'nothing')).toStrictEqual([]);
});

test('progress counts only what there is English for', () => {
  // Five cells of six have English; the sixth, Lithium's origin, is not a
  // message at all and is not counted against the translator.
  expect(tableProgress(tableRowStates(TABLE, CATALOG))).toStrictEqual({
    total: 5,
    translated: 4,
    missingRequired: 0,
  });
});

test('a required column left empty is counted apart', () => {
  const rows = tableRowStates(TABLE, {
    ...CATALOG,
    translation: {},
    drafts: {},
  });

  expect(tableProgress(rows)).toStrictEqual({
    total: 5,
    translated: 0,
    missingRequired: 3,
  });
});

test('every translated message of the page is a pair to draw from', () => {
  expect(translatedPairs([CATALOG])).toStrictEqual([
    {
      key: 'element.H.name',
      source: 'Hydrogen',
      target: 'Hydrogène',
    },
    {
      key: 'element.H.origin',
      source: "the Greek for 'water-forming'",
      target: "le grec pour 'formeur d'eau'",
    },
    {
      key: 'element.He.name',
      source: 'Helium',
      target: 'Hélium',
    },
    {
      key: 'element.Li.name',
      source: 'Lithium',
      target: 'Lithium',
    },
  ]);
});
