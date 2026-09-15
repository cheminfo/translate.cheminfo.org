import { expect, test } from 'vitest';

import { checkTranslation, messageArguments } from '../checkTranslation.ts';

test('a translation with the same placeholders has no problem', () => {
  expect(checkTranslation('Hello {name}', 'Bonjour {name}')).toStrictEqual([]);
});

test('an empty translation is refused', () => {
  expect(checkTranslation('Share', ' '.repeat(3))).toStrictEqual([
    { kind: 'empty', message: 'The translation is empty.' },
  ]);
});

test('a placeholder dropped from the translation is reported', () => {
  expect(checkTranslation('{count} files', 'des fichiers')).toStrictEqual([
    {
      kind: 'missing-argument',
      argument: '{count}',
      message: '{count} is in the English message but not in the translation.',
    },
  ]);
});

test('a placeholder the English message does not have is reported', () => {
  expect(checkTranslation('Files', '{total} fichiers')).toStrictEqual([
    {
      kind: 'unknown-argument',
      argument: '{total}',
      message:
        '{total} is not in the English message, so nothing would fill it.',
    },
  ]);
});

test('a placeholder used in one plural branch only still counts', () => {
  expect(
    checkTranslation(
      '{count, plural, one {# file in {folder}} other {# files in {folder}}}',
      '{count, plural, one {# fichier} other {# fichiers dans {folder}}}',
    ),
  ).toStrictEqual([]);
});

test('a tag dropped from the translation is reported', () => {
  const problems = checkTranslation(
    'Read <link>the guide</link>',
    'Lisez le guide',
  );
  expect(problems.map((problem) => problem.argument)).toStrictEqual(['<link>']);
});

test('a translation that does not parse is a syntax problem', () => {
  const problems = checkTranslation('{count} files', '{count fichiers');
  expect(problems).toHaveLength(1);
  expect(problems[0]?.kind).toBe('syntax');
  expect(problems[0]?.message).toMatch(/^The message does not parse \(/);
});

test('an English message that does not parse is reported as such', () => {
  const problems = checkTranslation('{broken', 'cassé');
  expect(problems).toHaveLength(1);
  expect(problems[0]?.kind).toBe('source-syntax');
});

test('every kind of placeholder is named as it is written', () => {
  expect([
    ...messageArguments(
      '{when, date, short} {amount, number} {gender, select, male {he} other {<b>they</b>}}',
    ),
  ]).toStrictEqual(['{when}', '{amount}', '{gender}', '<b>']);
});
