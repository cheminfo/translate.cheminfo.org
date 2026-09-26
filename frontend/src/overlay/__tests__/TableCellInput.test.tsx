// @vitest-environment happy-dom

import { renderToStaticMarkup } from 'react-dom/server';
import { expect, test } from 'vitest';

import { TableCellInput } from '../TableCellInput.tsx';
import type { TableCellState } from '../tableRows.ts';

const CELL: TableCellState = {
  key: 'element.Fe.name',
  field: { id: 'name', label: 'Name', required: true },
  source: 'Iron',
  value: 'Fer',
  published: 'Fer',
  status: 'translated',
  problems: [],
};

function markup(cell: TableCellState, editingValue?: string): string {
  return renderToStaticMarkup(
    <TableCellInput
      cell={cell}
      editingValue={editingValue}
      pairs={[]}
      onChange={() => undefined}
      onCommit={() => undefined}
    />,
  );
}

test('the box holds what is published when nobody is typing in it', () => {
  expect(markup(CELL)).toContain('Fer');
});

test('while it is being typed in, the box holds what is being typed', () => {
  const written = markup(CELL, 'Ferro');
  expect(written).toContain('Ferro');
  expect(written).not.toContain('>Fer<');
});

test('a column the English does not fill cannot be written', () => {
  const absent = markup({ ...CELL, source: '', value: '' });
  expect(absent).toContain('—');
  expect(absent).not.toContain('<textarea');
});

test('a required column says so while it is empty', () => {
  expect(markup({ ...CELL, value: '', published: undefined })).toContain(
    'placeholder="required"',
  );
});

test('an optional column asks for nothing', () => {
  expect(
    markup({
      ...CELL,
      field: { id: 'origin', label: 'Origin' },
      value: '',
      published: undefined,
    }),
  ).toContain('placeholder=""');
});

test('a translation that cannot be used says why, once', () => {
  const written = markup({
    ...CELL,
    value: 'Fer {count}',
    problems: [
      {
        kind: 'unknown-argument',
        argument: 'count',
        message: 'count is not in the English message.',
      },
      {
        kind: 'unknown-argument',
        argument: 'other',
        message: 'other is not either.',
      },
    ],
  });
  expect(written).toContain('count is not in the English message.');
  expect(written).not.toContain('other is not either.');
});

test('nothing is suggested to a cell nobody is typing in', () => {
  const pairs = [{ key: 'element.Au.name', source: 'Iron', target: 'Fer' }];
  const quiet = renderToStaticMarkup(
    <TableCellInput
      cell={{ ...CELL, value: '', published: undefined }}
      editingValue={undefined}
      pairs={pairs}
      onChange={() => undefined}
      onCommit={() => undefined}
    />,
  );
  expect(quiet).not.toContain('Already written');

  const typing = renderToStaticMarkup(
    <TableCellInput
      cell={{ ...CELL, value: '', published: undefined }}
      editingValue=""
      pairs={pairs}
      onChange={() => undefined}
      onCommit={() => undefined}
    />,
  );
  expect(typing).toContain('Already written');
});
