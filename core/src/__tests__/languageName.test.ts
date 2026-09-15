import { expect, test } from 'vitest';

import { languageName } from '../languageName.ts';

test('a locale is named in English by default', () => {
  expect(languageName('fr')).toBe('French');
  expect(languageName('pt-BR')).toBe('Brazilian Portuguese');
});

test('a locale can be named in another language', () => {
  expect(languageName('de', 'fr')).toBe('allemand');
});

test('a tag the runtime cannot name is written as the tag', () => {
  expect(languageName('###')).toBe('###');
});
