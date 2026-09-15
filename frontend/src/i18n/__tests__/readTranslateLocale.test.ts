import { expect, test } from 'vitest';

import { readTranslateLocale } from '../readTranslateLocale.ts';

test('?translate names the locale the page is translated into', () => {
  expect(readTranslateLocale('?translate=fr')).toBe('fr');
  expect(readTranslateLocale('?embed&translate=pt-BR')).toBe('pt-BR');
});

test('a page without the parameter, or naming English, is not in translate mode', () => {
  expect(readTranslateLocale('')).toBeUndefined();
  expect(readTranslateLocale('?translate=en')).toBeUndefined();
});

test('a value that is not a canonical locale is ignored', () => {
  expect(readTranslateLocale('?translate=')).toBeUndefined();
  expect(readTranslateLocale('?translate=pt-br')).toBeUndefined();
  expect(readTranslateLocale('?translate=%3Cscript%3E')).toBeUndefined();
});
