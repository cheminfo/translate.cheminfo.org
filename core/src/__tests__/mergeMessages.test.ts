import { expect, test } from 'vitest';

import {
  changedKeys,
  mergeMessages,
  parseMessages,
  serializeMessages,
} from '../mergeMessages.ts';

const SOURCE = { title: 'Title', share: 'Share', close: 'Close' };

test('merged keys follow the English order, and keys no longer in English stay last', () => {
  const merged = mergeMessages(
    SOURCE,
    { close: 'Fermer', removed: 'Supprimé' },
    { share: 'Partager', title: 'Titre' },
  );
  expect(merged).toStrictEqual({
    title: 'Titre',
    share: 'Partager',
    close: 'Fermer',
    removed: 'Supprimé',
  });
  expect(Object.keys(merged)).toStrictEqual([
    'title',
    'share',
    'close',
    'removed',
  ]);
});

test('an update replaces the published message', () => {
  expect(
    mergeMessages(SOURCE, { share: 'Partage' }, { share: 'Partager' }),
  ).toStrictEqual({ share: 'Partager' });
});

test('only the messages that differ count as changed', () => {
  expect(
    changedKeys(
      { share: 'Partager', close: 'Fermer' },
      { share: 'Partager', close: 'Clore', title: 'Titre' },
    ),
  ).toStrictEqual(['close', 'title']);
});

test('a catalog file is two-space JSON ending with a newline', () => {
  expect(serializeMessages({ share: 'Partager', close: 'Fermer' })).toBe(
    '{\n  "share": "Partager",\n  "close": "Fermer"\n}\n',
  );
});

test('a catalog file reads back as the messages it holds', () => {
  expect(parseMessages('{"share":"Partager"}')).toStrictEqual({
    share: 'Partager',
  });
});

test('a catalog file that is not a flat object of strings is refused', () => {
  expect(() => parseMessages('["share"]')).toThrow(
    'a catalog file must hold one JSON object',
  );
  expect(() => parseMessages('{"count":3}')).toThrow(
    'the message "count" is not a string',
  );
});
