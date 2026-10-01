import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { expect, test } from 'vitest';

import en from '../../locales/en.json' with { type: 'json' };

const DIRECTORY = join(import.meta.dirname, '..', '..', 'locales');

const LOCALES = readdirSync(DIRECTORY)
  .filter((file) => file.endsWith('.json') && file !== 'en.json')
  .map((file) => file.replace('.json', ''));

test('a locale is offered only once its whole catalog is written', () => {
  expect(LOCALES).toStrictEqual(['fr']);
  const keys = Object.keys(en).toSorted();

  for (const locale of LOCALES) {
    const messages = JSON.parse(
      readFileSync(join(DIRECTORY, `${locale}.json`), 'utf8'),
    ) as Record<string, string>;
    expect(Object.keys(messages).toSorted()).toStrictEqual(keys);
    for (const key of keys) {
      expect(placeholdersOf(messages[key] ?? '')).toStrictEqual(
        placeholdersOf((en as Record<string, string>)[key] ?? ''),
      );
      expect(messages[key]?.trim()).not.toBe('');
    }
  }
});

/**
 * The placeholder names a message interpolates, sorted.
 *
 * A translation that drops one, or renames it, formats a sentence with a hole
 * in it — which no missing-key check would catch.
 * @param message - Message to read.
 * @returns The names, sorted and deduplicated.
 */
function placeholdersOf(message: string): string[] {
  const names = new Set<string>();
  for (const match of message.matchAll(/\{\s*(?<name>[\w.]+)/g)) {
    const name = match.groups?.name;
    if (name !== undefined && !/^\d+$/.test(name)) names.add(name);
  }
  return [...names].toSorted();
}
