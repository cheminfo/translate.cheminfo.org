import { expect, test } from 'vitest';

import type { CatalogSource } from '../catalog.ts';
import { readMarkers, stripMarkers } from '../marker.ts';
import { TranslateSession } from '../session.ts';

const SITE: CatalogSource = {
  id: 'site',
  repository: 'cheminfo/example',
  directory: 'src/locales',
  messages: {
    title: 'Periodic table',
    count: '{count, plural, one {# element} other {# elements}}',
    greeting: 'Hello {name}',
  },
};

function frenchSession(marked = false) {
  return new TranslateSession({
    locale: 'fr',
    catalogs: [SITE],
    translations: {
      site: {
        title: 'Tableau périodique',
        count: '{count, plural, one {# élément} other {# éléments}}',
      },
    },
    marked,
  });
}

test('the published translation is shown, with its plural rules', () => {
  const session = frenchSession();
  expect(session.format('site', 'title')).toBe('Tableau périodique');
  expect(session.format('site', 'count', { count: 1 })).toBe('1 élément');
  expect(session.format('site', 'count', { count: 118 })).toBe('118 éléments');
});

test('a message with no translation falls back to English', () => {
  expect(frenchSession().format('site', 'greeting', { name: 'Ada' })).toBe(
    'Hello Ada',
  );
});

test('an unknown catalog or key shows the key', () => {
  const session = frenchSession();
  expect(session.format('site', 'missing')).toBe('missing');
  expect(session.format('elsewhere', 'title')).toBe('title');
});

test('in translate mode a message carries the marker of its reference', () => {
  const session = frenchSession(true);
  const title = session.format('site', 'title');
  const again = session.format('site', 'title');
  const greeting = session.format('site', 'greeting', { name: 'Ada' });

  expect(stripMarkers(title)).toBe('Tableau périodique');
  expect(readMarkers(title)).toStrictEqual(readMarkers(again));
  const [greetingId] = readMarkers(greeting);
  expect(session.resolveMarker(greetingId ?? -1)).toStrictEqual({
    catalogId: 'site',
    key: 'greeting',
  });
});

test('a draft replaces the message and notifies every listener once', () => {
  const session = frenchSession();
  let calls = 0;
  session.subscribe(() => {
    calls++;
  });

  session.setDraft({ catalogId: 'site', key: 'greeting' }, 'Bonjour {name}');
  session.setDraft({ catalogId: 'site', key: 'greeting' }, 'Bonjour {name}');

  expect(session.format('site', 'greeting', { name: 'Ada' })).toBe(
    'Bonjour Ada',
  );
  expect(calls).toBe(1);
  expect(session.version).toBe(1);
  expect(session.catalogs()[0]?.drafts).toStrictEqual({
    greeting: 'Bonjour {name}',
  });
});

test('a draft that cannot be formatted leaves the published message on the page', () => {
  const session = frenchSession();
  session.setDraft({ catalogId: 'site', key: 'title' }, '{broken');
  expect(session.format('site', 'title')).toBe('Tableau périodique');

  session.setDraft({ catalogId: 'site', key: 'title' }, 'Table {unknown}');
  expect(session.format('site', 'title')).toBe('Tableau périodique');
});

test('removing a draft brings the published message back', () => {
  const session = frenchSession();
  session.setDraft({ catalogId: 'site', key: 'title' }, 'Table');
  session.setDraft({ catalogId: 'site', key: 'title' }, undefined);
  expect(session.format('site', 'title')).toBe('Tableau périodique');
  expect(session.catalogs()[0]?.drafts).toStrictEqual({});
});

test('a draft that drops a placeholder formats, but is not shown', () => {
  const session = frenchSession();
  session.setDraft({ catalogId: 'site', key: 'greeting' }, 'Bonjour');
  expect(session.format('site', 'greeting', { name: 'Ada' })).toBe('Hello Ada');
  expect(session.catalogs()[0]?.drafts).toStrictEqual({ greeting: 'Bonjour' });
});

test('a draft for a key the catalog does not have is ignored', () => {
  const session = frenchSession();
  session.setDraft({ catalogId: 'site', key: 'invented' }, 'Inventé');
  expect(session.version).toBe(0);
});

test('a listener that unsubscribed is no longer told', () => {
  const session = frenchSession();
  let calls = 0;
  const stop = session.subscribe(() => {
    calls++;
  });
  stop();
  session.setDraft({ catalogId: 'site', key: 'title' }, 'Table');
  expect(calls).toBe(0);
});
