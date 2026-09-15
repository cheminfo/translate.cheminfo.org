// @vitest-environment happy-dom

import type { MessageRef } from 'translate-core';
import { markText } from 'translate-core';
import { expect, test } from 'vitest';

import { annotatePage, clearAnnotations } from '../annotatePage.ts';
import type { MessageStatus } from '../messageStatus.ts';
import { scanPage } from '../scanPage.ts';

const REFS: MessageRef[] = [
  { catalogId: 'site', key: 'title' },
  { catalogId: 'site', key: 'name' },
  { catalogId: 'site', key: 'value' },
];

function resolve(id: number): MessageRef | undefined {
  return REFS[id];
}

function statusOf(ref: MessageRef): MessageStatus {
  return ref.key === 'value' ? 'missing' : 'translated';
}

function buildPage() {
  document.body.replaceChildren();
  const heading = document.createElement('h1');
  heading.textContent = markText('Periodic table', 0);
  const pair = document.createElement('p');
  pair.append(markText('Name', 1), ': ', markText('Value', 2));
  const label = document.createElement('label');
  label.textContent = 'Search';
  document.body.append(heading, pair, label);
  return { heading, pair, label };
}

test('an element carries its messages and the most pressing of their statuses', () => {
  const { heading, pair, label } = buildPage();
  const annotated = new Set<Element>();
  annotatePage(scanPage(document.body, resolve), statusOf, annotated);

  expect(heading.dataset.translateKeys).toBe('site:title');
  expect(heading.dataset.translateState).toBe('translated');
  expect(pair.dataset.translateKeys).toBe('site:name site:value');
  expect(pair.dataset.translateState).toBe('missing');
  expect(label.dataset.translateHardcoded).toBe('');
  expect(annotated.size).toBe(3);
});

test('an element that stops showing a message is cleaned on the next pass', () => {
  const { heading } = buildPage();
  const annotated = new Set<Element>();
  annotatePage(scanPage(document.body, resolve), statusOf, annotated);

  heading.textContent = 'Plain title';
  annotatePage(scanPage(document.body, resolve), statusOf, annotated);

  expect(heading.dataset.translateKeys).toBeUndefined();
  expect(heading.dataset.translateState).toBeUndefined();
  expect(heading.dataset.translateHardcoded).toBe('');
});

test('clearing removes every annotation from the page', () => {
  buildPage();
  const annotated = new Set<Element>();
  annotatePage(scanPage(document.body, resolve), statusOf, annotated);
  clearAnnotations(annotated);

  expect(
    document.querySelectorAll(
      '[data-translate-keys], [data-translate-state], [data-translate-hardcoded]',
    ),
  ).toHaveLength(0);
  expect(annotated.size).toBe(0);
});
