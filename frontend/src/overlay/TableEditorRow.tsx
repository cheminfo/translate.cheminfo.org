import type { ReactElement } from 'react';
import { memo } from 'react';
import type { TranslatedPair } from 'react-cheminfo/translate';

import { TableCellInput } from './TableCellInput.tsx';
import type { TableCellState, TableRowState } from './tableRows.ts';

export interface TableEditorRowProps {
  /** The row to draw. */
  row: TableRowState;
  /** The cell being typed in, when it is one of this row's. */
  editingKey: string | undefined;
  /** What is being typed there. */
  editingValue: string | undefined;
  /** Every message already translated. */
  pairs: readonly TranslatedPair[];
  onChange: (key: string, value: string) => void;
  onCommit: (cell: TableCellState, value: string) => void;
}

/**
 * One row of the table: what names it, the English of every written column,
 * and the boxes those are written into.
 *
 * Remembered between renders, so typing in one cell of a hundred-row table
 * redraws that row and no other.
 * @param props - The row, what is being typed, and where it goes.
 * @returns The row.
 */
export const TableEditorRow = memo(function TableEditorRow(
  props: TableEditorRowProps,
): ReactElement {
  const { row, editingKey, editingValue, pairs, onChange, onCommit } = props;

  return (
    <tr data-status={row.status}>
      <th scope="row" className="translate-table__row">
        {row.label}
      </th>
      {row.cells.map((cell) => (
        <td key={`en-${cell.key}`} className="translate-table__source">
          {cell.source === '' ? '—' : cell.source}
        </td>
      ))}
      {row.cells.map((cell) => (
        <td key={cell.key}>
          <TableCellInput
            cell={cell}
            editingValue={cell.key === editingKey ? editingValue : undefined}
            pairs={pairs}
            onChange={onChange}
            onCommit={onCommit}
          />
        </td>
      ))}
    </tr>
  );
});
