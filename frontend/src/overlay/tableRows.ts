/**
 * Reading a page's tables as a grid: one row per element, ion or quantity,
 * one cell per column a translator may write.
 *
 * Everything here is a plain function of the page's catalogs, so the grid, its
 * filters and its progress can be read without mounting anything.
 */

import type {
  CatalogSnapshot,
  MessageProblem,
  TranslatableField,
  TranslatableTable,
  TranslatedPair,
} from 'react-cheminfo/translate';
import {
  checkTranslation,
  ownMessage,
  tableCells,
} from 'react-cheminfo/translate';

import type { MessageStatus } from './messageStatus.ts';
import { messageStatus, worstStatus } from './messageStatus.ts';

/** One cell of the grid. */
export interface TableCellState {
  /** The catalog key, e.g. `element.Fe.name`. */
  key: string;
  /** The column it belongs to. */
  field: TranslatableField;
  /**
   * The English text. Empty means the site declares the column but has no
   * English for this row, so there is nothing to translate yet.
   */
  source: string;
  /** What the box holds: the edit, else what is published, else nothing. */
  value: string;
  /** What is published, if anything. */
  published: string | undefined;
  /** Where the cell stands. */
  status: MessageStatus;
  /** Why an edit cannot be used, when it cannot. */
  problems: MessageProblem[];
}

/** One row of the grid. */
export interface TableRowState {
  /** The row id, which is the middle of every key, e.g. `Fe`. */
  id: string;
  /** What names the row: data, never translated. */
  label: string;
  /** Its cells, in the order the columns are declared. */
  cells: TableCellState[];
  /** The most pressing status among its cells. */
  status: MessageStatus;
}

/** Which rows the grid shows. */
export type TableFilter = 'all' | 'missing' | 'edited';

/** How far a table has come. */
export interface TableProgress {
  /** Cells that have English to translate. */
  total: number;
  /** Of those, the ones translated or edited into a usable translation. */
  translated: number;
  /** Cells of a required column with nothing in them. */
  missingRequired: number;
}

/**
 * The grid of one table.
 * @param table - The table the page declared.
 * @param catalog - The catalog its keys belong to.
 * @returns One state per row, in the order the table lists them.
 */
export function tableRowStates(
  table: TranslatableTable,
  catalog: CatalogSnapshot,
): TableRowState[] {
  const byRow = new Map<string, TableCellState[]>();
  for (const cell of tableCells(table)) {
    const source = ownMessage(catalog.messages, cell.key) ?? '';
    const published = ownMessage(catalog.translation, cell.key);
    const draft = ownMessage(catalog.drafts, cell.key);
    const value = draft ?? published ?? '';
    const cells = byRow.get(cell.row.id) ?? [];
    cells.push({
      key: cell.key,
      field: cell.field,
      source,
      value,
      published,
      status: messageStatus(catalog, cell.key),
      problems:
        draft === undefined || draft === ''
          ? []
          : checkTranslation(source, draft),
    });
    byRow.set(cell.row.id, cells);
  }

  const rows: TableRowState[] = [];
  for (const row of table.rows) {
    const cells = byRow.get(row.id) ?? [];
    rows.push({
      id: row.id,
      label: row.label,
      cells,
      status: worstStatus(
        cells.filter((cell) => cell.source !== '').map((cell) => cell.status),
      ),
    });
  }
  return rows;
}

/**
 * The rows a filter and a search leave.
 *
 * The search reads the row's own name, the English and the translation alike,
 * so a translator can find a row by what it is called in either language.
 * @param rows - Every row of the table.
 * @param filter - Which rows are wanted.
 * @param search - What to look for; empty keeps everything.
 * @returns The rows to draw.
 */
export function filterRows(
  rows: readonly TableRowState[],
  filter: TableFilter,
  search: string,
): TableRowState[] {
  const query = search.trim().toLowerCase();
  const kept: TableRowState[] = [];
  for (const row of rows) {
    if (filter === 'missing' && !hasMissing(row)) continue;
    if (filter === 'edited' && !hasEdit(row)) continue;
    if (query !== '' && !matches(row, query)) continue;
    kept.push(row);
  }
  return kept;
}

/**
 * How far the table has come.
 * @param rows - Every row of the table.
 * @returns The counts.
 */
export function tableProgress(rows: readonly TableRowState[]): TableProgress {
  const progress: TableProgress = {
    total: 0,
    translated: 0,
    missingRequired: 0,
  };
  for (const row of rows) {
    for (const cell of row.cells) {
      if (cell.source === '') continue;
      progress.total++;
      if (cell.status === 'translated' || cell.status === 'draft') {
        progress.translated++;
      } else if (cell.field.required === true) {
        progress.missingRequired++;
      }
    }
  }
  return progress;
}

/**
 * Every message already translated on this page, whatever catalog or table it
 * belongs to — which is what a suggestion is drawn from.
 * @param catalogs - Every catalog of the page.
 * @returns One pair per translated message.
 */
export function translatedPairs(
  catalogs: readonly CatalogSnapshot[],
): TranslatedPair[] {
  const pairs: TranslatedPair[] = [];
  for (const catalog of catalogs) {
    for (const [key, source] of Object.entries(catalog.messages)) {
      const target =
        ownMessage(catalog.drafts, key) ?? ownMessage(catalog.translation, key);
      if (target === undefined || target === '') continue;
      pairs.push({ key, source, target });
    }
  }
  return pairs;
}

function hasMissing(row: TableRowState): boolean {
  for (const cell of row.cells) {
    if (cell.source !== '' && cell.status === 'missing') return true;
  }
  return false;
}

function hasEdit(row: TableRowState): boolean {
  for (const cell of row.cells) {
    if (cell.status === 'draft' || cell.status === 'invalid') return true;
  }
  return false;
}

function matches(row: TableRowState, query: string): boolean {
  if (row.label.toLowerCase().includes(query)) return true;
  if (row.id.toLowerCase().includes(query)) return true;
  for (const cell of row.cells) {
    if (cell.source.toLowerCase().includes(query)) return true;
    if (cell.value.toLowerCase().includes(query)) return true;
  }
  return false;
}
