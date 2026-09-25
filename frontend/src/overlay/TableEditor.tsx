import {
  Button,
  Dialog,
  DialogBody,
  DialogFooter,
  HTMLSelect,
  InputGroup,
  ProgressBar,
  SegmentedControl,
} from '@blueprintjs/core';
import type { ReactElement } from 'react';
import { useCallback, useMemo, useState } from 'react';
import { formatInteger } from 'react-cheminfo/core';
import type {
  CatalogSnapshot,
  TranslatableTable,
  TranslateBridge,
} from 'react-cheminfo/translate';
import { languageName } from 'react-cheminfo/translate';

import { TableEditorRow } from './TableEditorRow.tsx';
import type { TableCellState, TableFilter } from './tableRows.ts';
import {
  filterRows,
  tableProgress,
  tableRowStates,
  translatedPairs,
} from './tableRows.ts';

export interface TableEditorProps {
  /** The page's session. */
  bridge: TranslateBridge;
  /** The tables the page declared. */
  tables: readonly TranslatableTable[];
  /** Every catalog of the page. */
  catalogs: readonly CatalogSnapshot[];
  onClose: () => void;
}

const FILTERS: Array<{ label: string; value: TableFilter }> = [
  { label: 'All', value: 'all' },
  { label: 'Missing', value: 'missing' },
  { label: 'Edited', value: 'edited' },
];

/**
 * The editor of a whole table at once.
 *
 * A hundred and eighteen element names are not translated by Alt-clicking a
 * hundred and eighteen cells; they are translated a column at a time, with the
 * English beside the box and what was written three rows above offered under
 * it. Only the columns the site declared as prose are here — a mass, a radius
 * and an identifier are not in any catalog and so cannot be reached.
 * @param props - The page, its tables and its catalogs.
 * @returns The editor.
 */
export function TableEditor(props: TableEditorProps): ReactElement {
  const { bridge, tables, catalogs, onClose } = props;
  const [tableId, setTableId] = useState(() => tables[0]?.id ?? '');
  const [filter, setFilter] = useState<TableFilter>('all');
  const [search, setSearch] = useState('');
  // Only one cell is ever being typed in, so the text on its way to the page
  // is one string rather than a draft per cell.
  const [editing, setEditing] = useState<{ key: string; value: string }>();

  const table = tables.find((one) => one.id === tableId) ?? tables[0];
  const catalog = catalogs.find((one) => one.id === table?.catalogId);
  const pairs = useMemo(() => translatedPairs(catalogs), [catalogs]);

  const rows = useMemo(
    () =>
      table === undefined || catalog === undefined
        ? []
        : tableRowStates(table, catalog),
    [table, catalog],
  );
  const shown = useMemo(
    () => filterRows(rows, filter, search),
    [rows, filter, search],
  );
  const progress = tableProgress(rows);
  const language = languageName(bridge.locale);

  const change = useCallback((key: string, value: string) => {
    setEditing({ key, value });
  }, []);

  const commit = useCallback(
    (cell: TableCellState, value: string) => {
      setEditing(undefined);
      if (catalog === undefined) return;
      const unchanged = value === '' || value === cell.published;
      bridge.setDraft(
        { catalogId: catalog.id, key: cell.key },
        unchanged ? undefined : value,
      );
    },
    [bridge, catalog],
  );

  return (
    <Dialog
      isOpen
      onClose={onClose}
      title={`${language} — tables`}
      icon="th"
      className="translate-table-dialog"
    >
      <div className="translate-table-bar">
        {tables.length > 1 ? (
          <HTMLSelect
            value={table?.id ?? ''}
            aria-label="Table"
            onChange={(event) => {
              setTableId(event.currentTarget.value);
            }}
          >
            {tables.map((one) => (
              <option key={one.id} value={one.id}>
                {one.label}
              </option>
            ))}
          </HTMLSelect>
        ) : null}
        <SegmentedControl
          size="small"
          options={FILTERS}
          value={filter}
          onValueChange={(value) => {
            setFilter(value as TableFilter);
          }}
        />
        <InputGroup
          leftIcon="search"
          placeholder="Search rows"
          value={search}
          onValueChange={setSearch}
        />
        <span className="translate-table-progress">
          <ProgressBar
            animate={false}
            stripes={false}
            intent={progress.missingRequired === 0 ? 'success' : 'primary'}
            value={
              progress.total === 0 ? 0 : progress.translated / progress.total
            }
          />
          <span>
            {formatInteger(progress.translated)} of{' '}
            {formatInteger(progress.total)}
          </span>
        </span>
      </div>

      <DialogBody className="translate-table-body">
        {table === undefined || catalog === undefined ? (
          <p>This page declares no table.</p>
        ) : (
          <table className="translate-table">
            <thead>
              <tr>
                <th scope="col">{table.label}</th>
                {table.fields.map((field) => (
                  <th key={`en-${field.id}`} scope="col">
                    {field.label}
                    <span className="translate-table__note">English</span>
                  </th>
                ))}
                {table.fields.map((field) => (
                  <th key={field.id} scope="col" title={field.hint}>
                    {field.label}
                    <span className="translate-table__note">{language}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {shown.map((row) => (
                <TableEditorRow
                  key={row.id}
                  row={row}
                  editingKey={editing?.key}
                  editingValue={editing?.value}
                  pairs={pairs}
                  onChange={change}
                  onCommit={commit}
                />
              ))}
            </tbody>
          </table>
        )}
        {shown.length === 0 && rows.length > 0 ? (
          <p className="translate-table__empty">No row matches.</p>
        ) : null}
      </DialogBody>

      <DialogFooter
        actions={<Button intent="primary" text="Done" onClick={onClose} />}
      >
        <span className="translate-hint">
          {formatInteger(shown.length)} of {formatInteger(rows.length)} rows
          {progress.missingRequired > 0
            ? ` · ${formatInteger(progress.missingRequired)} required still empty`
            : ''}
        </span>
      </DialogFooter>
    </Dialog>
  );
}
