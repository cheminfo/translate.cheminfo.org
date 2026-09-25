import { Callout, TextArea } from '@blueprintjs/core';
import type { ReactElement } from 'react';
import { useMemo } from 'react';
import type { TranslatedPair } from 'react-cheminfo/translate';
import { messageSuggestions } from 'react-cheminfo/translate';

import { SuggestionChips } from './SuggestionChips.tsx';
import type { TableCellState } from './tableRows.ts';

export interface TableCellInputProps {
  /** The cell being written. */
  cell: TableCellState;
  /** The text being typed, while this is the cell being typed in. */
  editingValue: string | undefined;
  /** Every message already translated, which suggestions are drawn from. */
  pairs: readonly TranslatedPair[];
  /** Told what is in the box as it is typed. */
  onChange: (key: string, value: string) => void;
  /** Told to keep what is in the box, or to drop the edit for `undefined`. */
  onCommit: (cell: TableCellState, value: string) => void;
}

/**
 * One cell of the table.
 *
 * What is typed is kept by the editor until the cell is left, rather than
 * reaching the page on every keystroke as an Alt-clicked message does: a row
 * of a table is usually not on the page at all, and redrawing a hundred rows
 * per keystroke would be paid for nothing. Leaving the cell — by Tab, by
 * Enter, or by clicking away — is what commits it.
 * @param props - The cell, what is being typed, and where it goes.
 * @returns The box, with what it could be filled from.
 */
export function TableCellInput(props: TableCellInputProps): ReactElement {
  const { cell, editingValue, pairs, onChange, onCommit } = props;
  const value = editingValue ?? cell.value;
  const isEditing = editingValue !== undefined;

  const suggestions = useMemo(
    () =>
      isEditing && value === '' && cell.source !== ''
        ? messageSuggestions(cell.source, pairs)
        : [],
    [isEditing, value, cell.source, pairs],
  );

  if (cell.source === '') {
    return (
      <span
        className="translate-cell__absent"
        title={`${cell.key} is not in the English catalog`}
      >
        —
      </span>
    );
  }

  return (
    <div className="translate-cell">
      <TextArea
        fill
        autoResize
        value={value}
        placeholder={cell.field.required === true ? 'required' : ''}
        intent={cell.problems.length > 0 ? 'danger' : 'none'}
        onChange={(event) => {
          onChange(cell.key, event.currentTarget.value);
        }}
        onFocus={() => {
          onChange(cell.key, cell.value);
        }}
        onBlur={() => {
          onCommit(cell, value);
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            event.currentTarget.blur();
          }
          if (event.key === 'Escape') {
            onChange(cell.key, cell.value);
            event.currentTarget.blur();
          }
        }}
      />
      {cell.problems.length > 0 ? (
        <Callout intent="danger" compact className="translate-cell__problem">
          {cell.problems[0]?.message}
        </Callout>
      ) : null}
      <SuggestionChips
        suggestions={suggestions}
        onTake={(message) => {
          onChange(cell.key, message);
          onCommit(cell, message);
        }}
      />
    </div>
  );
}
