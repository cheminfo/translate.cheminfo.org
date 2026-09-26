// @vitest-environment happy-dom

import { renderToStaticMarkup } from 'react-dom/server';
import { expect, test } from 'vitest';

import { TableEditorRow } from '../TableEditorRow.tsx';
import type { TableRowState } from '../tableRows.ts';

const ROW: TableRowState = {
  id: 'Fe',
  label: '26 · Fe',
  status: 'missing',
  cells: [
    {
      key: 'element.Fe.name',
      field: { id: 'name', label: 'Name', required: true },
      source: 'Iron',
      value: '',
      published: undefined,
      status: 'missing',
      problems: [],
    },
    {
      key: 'element.Fe.origin',
      field: { id: 'origin', label: 'Origin', size: 'paragraph' },
      source: 'the Latin ferrum',
      value: 'du latin ferrum',
      published: 'du latin ferrum',
      status: 'translated',
      problems: [],
    },
  ],
};

function markup(editingKey?: string, editingValue?: string): string {
  return renderToStaticMarkup(
    <table>
      <tbody>
        <TableEditorRow
          row={ROW}
          editingKey={editingKey}
          editingValue={editingValue}
          pairs={[]}
          onChange={() => undefined}
          onCommit={() => undefined}
        />
      </tbody>
    </table>,
  );
}

test('the row is named by data, and the English of every column is beside it', () => {
  const written = markup();
  expect(written).toContain('26 · Fe');
  expect(written).toContain('Iron');
  expect(written).toContain('the Latin ferrum');
});

test('the row says how pressing it is, for the bar down its side', () => {
  expect(markup()).toContain('data-status="missing"');
});

test('one box per written column, holding what is already there', () => {
  const written = markup();
  expect(written.match(/<textarea/g)).toHaveLength(2);
  expect(written).toContain('du latin ferrum');
});

test('only the cell being typed in takes the text being typed', () => {
  const written = markup('element.Fe.name', 'Ferro');
  expect(written).toContain('Ferro');
  // The other cell keeps what is published rather than the draft of its sibling.
  expect(written).toContain('du latin ferrum');
});
