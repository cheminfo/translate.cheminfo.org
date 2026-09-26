import type { ReactElement } from 'react';
import type { MessageSuggestion } from 'react-cheminfo/translate';
import { expect, test } from 'vitest';

import { SuggestionChips } from '../SuggestionChips.tsx';

// The row is a plain function of its props, so its chips can be read and
// clicked without mounting it.
const renderChips = SuggestionChips;

const SUGGESTIONS: MessageSuggestion[] = [
  {
    message: 'Fer',
    kind: 'exact',
    score: 1,
    from: { key: 'element.Fe.name', source: 'Iron', target: 'Fer' },
  },
  {
    message: 'Période 4',
    kind: 'pattern',
    score: 0.8,
    from: { key: 'ui.period', source: 'Period 3', target: 'Période 3' },
  },
];

interface ChipProps {
  children: string;
  onClick: () => void;
  minimal?: boolean;
}

interface TooltipProps {
  children: ReactElement<ChipProps>;
}

// The caption first, then the chips as one mapped child.
function chipsOf(row: ReactElement): Array<ReactElement<TooltipProps>> {
  const children = (row as ReactElement<{ children: unknown[] }>).props
    .children;
  return children[1] as Array<ReactElement<TooltipProps>>;
}

test('nothing is offered when nothing was written before', () => {
  expect(renderChips({ suggestions: [], onTake: () => undefined })).toBeNull();
});

test('one chip per suggestion, in the order they were ranked', () => {
  const row = renderChips({
    suggestions: SUGGESTIONS,
    onTake: () => undefined,
  }) as ReactElement;

  expect(
    chipsOf(row).map((chip) => chip.props.children.props.children),
  ).toStrictEqual(['Fer', 'Période 4']);
});

test('the one that needs no adapting is the one drawn solid', () => {
  const row = renderChips({
    suggestions: SUGGESTIONS,
    onTake: () => undefined,
  }) as ReactElement;
  const [exact, pattern] = chipsOf(row);

  expect(exact?.props.children.props.minimal).toBe(false);
  expect(pattern?.props.children.props.minimal).toBe(true);
});

test('a chip reaches the box only when it is clicked', () => {
  const taken: string[] = [];
  const row = renderChips({
    suggestions: SUGGESTIONS,
    onTake: (message) => taken.push(message),
  }) as ReactElement;

  expect(taken).toStrictEqual([]);
  chipsOf(row)[1]?.props.children.props.onClick();
  expect(taken).toStrictEqual(['Période 4']);
});
