import { expect, test } from 'vitest';

import {
  commitMessage,
  pullRequestBody,
  pullRequestTitle,
} from '../pullRequestText.ts';

test('the title is a conventional commit subject naming the language', () => {
  expect(pullRequestTitle('fr', 1)).toBe(
    'feat(i18n): translate 1 message into French',
  );
  expect(pullRequestTitle('pt-BR', 12)).toBe(
    'feat(i18n): translate 12 messages into Brazilian Portuguese',
  );
});

test('the description escapes what the translator typed', () => {
  expect(
    pullRequestBody({
      locale: 'fr',
      catalogs: [
        { directory: 'src/locales', count: 2 },
        { directory: 'src/share/locales', count: 1 },
      ],
      contributor: '  Ada\n Lovelace ',
      note: 'Please check @cheminfo/team\n\n<b>thanks</b>',
    }),
  ).toBe(
    [
      '3 messages translated into French (`fr`) with the translate overlay of translate.cheminfo.org.',
      '',
      'Submitted by Ada Lovelace.',
      '',
      '> Please check &#64;cheminfo/team',
      '>',
      '> &lt;b&gt;thanks&lt;/b&gt;',
      '',
      '| Catalog | Messages |',
      '| --- | ---: |',
      '| `src/locales` | 2 |',
      '| `src/share/locales` | 1 |',
      '',
      'Each message was checked before this pull request was opened: it parses as ICU MessageFormat and uses exactly the placeholders of the English one.',
      '',
    ].join('\n'),
  );
});

test('an anonymous commit says so', () => {
  expect(
    commitMessage({
      locale: 'de',
      catalogs: [{ directory: 'locales', count: 1 }],
    }),
  ).toBe(
    'feat(i18n): translate 1 message into German\n\nSubmitted anonymously.\n',
  );
});
