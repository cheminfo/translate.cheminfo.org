// @vitest-environment happy-dom

import type { MessageRef } from 'translate-core';
import { markText } from 'translate-core';
import { expect, test } from 'vitest';

import { refName, scanPage } from '../scanPage.ts';

const REFS: MessageRef[] = [
  { catalogId: 'site', key: 'title' },
  { catalogId: 'site', key: 'share' },
  { catalogId: 'site', key: 'name' },
  { catalogId: 'site', key: 'value' },
];

function resolve(id: number): MessageRef | undefined {
  return REFS[id];
}

function element(tag: string, text: string): HTMLElement {
  const created = document.createElement(tag);
  created.textContent = text;
  return created;
}

function buildPage() {
  document.body.replaceChildren();
  const heading = element('h1', markText('Periodic table', 0));
  const button = element('button', 'OK');
  button.setAttribute('title', markText('Share this page', 1));
  const pair = document.createElement('p');
  pair.append(
    markText('Name', 2),
    ': ',
    markText('Value', 3),
    markText('Name', 2),
  );
  const formula = element('span', 'C6H6 benzene');
  formula.setAttribute('translate', 'no');
  const host = element('div', 'Overlay text');
  document.body.append(
    heading,
    button,
    pair,
    element('span', '118'),
    formula,
    element('code', 'const table'),
    element('label', 'Search'),
    element('em', markText('Ghost', 99)),
    host,
  );
  return { host };
}

test('messages are found in text and in attributes, one entry per element', () => {
  const { host } = buildPage();
  const scan = scanPage(document.body, resolve, host);

  expect(
    [...scan.elements].map(([found, refs]) => [
      found.tagName,
      refs.map((ref) => ref.key),
    ]),
  ).toStrictEqual([
    ['H1', ['title']],
    ['BUTTON', ['share']],
    ['P', ['name', 'value']],
  ]);
  expect(
    scan.found.map((entry) => [entry.ref.key, entry.attribute ?? 'text']),
  ).toStrictEqual([
    ['title', 'text'],
    ['share', 'title'],
    ['name', 'text'],
    ['value', 'text'],
    ['name', 'text'],
  ]);
  expect([...scan.names]).toStrictEqual([
    'site:title',
    'site:share',
    'site:name',
    'site:value',
  ]);
});

test('text no message produced is reported; numbers, code, translate="no" and the overlay are not', () => {
  const { host } = buildPage();
  const scan = scanPage(document.body, resolve, host);
  expect(scan.hardcoded.map((found) => found.tagName)).toStrictEqual([
    'BUTTON',
    'LABEL',
  ]);
});

test('a message is named by its catalog and key', () => {
  expect(
    refName({ catalogId: 'react-cheminfo/share', key: 'dialog.title' }),
  ).toBe('react-cheminfo/share:dialog.title');
});
