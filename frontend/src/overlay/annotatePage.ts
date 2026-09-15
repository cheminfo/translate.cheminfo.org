import type { MessageRef } from 'translate-core';

import type { MessageStatus } from './messageStatus.ts';
import { worstStatus } from './messageStatus.ts';
import type { PageScan } from './scanPage.ts';
import { refName } from './scanPage.ts';

/** The messages an element shows, as space separated `catalogId:key`. */
export const KEYS_ATTRIBUTE = 'data-translate-keys';

/** The most pressing status among them: what the outline is coloured by. */
export const STATE_ATTRIBUTE = 'data-translate-state';

/** Set on an element holding text no message produced. */
export const HARDCODED_ATTRIBUTE = 'data-translate-hardcoded';

/**
 * Write what a scan found onto the page itself, so an outline can be drawn by
 * CSS and anyone inspecting the DOM reads which message an element shows.
 * Elements annotated by the previous pass and absent from this one are
 * cleaned.
 * @param scan - The latest scan.
 * @param statusOf - The status of one message.
 * @param annotated - The elements annotated so far; updated in place.
 */
export function annotatePage(
  scan: PageScan,
  statusOf: (ref: MessageRef) => MessageStatus,
  annotated: Set<Element>,
): void {
  const current = new Set<Element>();

  for (const [element, refs] of scan.elements) {
    const names: string[] = [];
    const statuses: MessageStatus[] = [];
    for (const ref of refs) {
      names.push(refName(ref));
      statuses.push(statusOf(ref));
    }
    setAttribute(element, KEYS_ATTRIBUTE, names.join(' '));
    setAttribute(element, STATE_ATTRIBUTE, worstStatus(statuses));
    element.removeAttribute(HARDCODED_ATTRIBUTE);
    current.add(element);
  }

  for (const element of scan.hardcoded) {
    if (current.has(element)) continue;
    element.removeAttribute(KEYS_ATTRIBUTE);
    element.removeAttribute(STATE_ATTRIBUTE);
    setAttribute(element, HARDCODED_ATTRIBUTE, '');
    current.add(element);
  }

  for (const element of annotated) {
    if (!current.has(element)) clearElement(element);
  }
  annotated.clear();
  for (const element of current) annotated.add(element);
}

/**
 * Remove every annotation the overlay wrote.
 * @param annotated - The elements annotated; emptied.
 */
export function clearAnnotations(annotated: Set<Element>): void {
  for (const element of annotated) clearElement(element);
  annotated.clear();
}

function clearElement(element: Element): void {
  element.removeAttribute(KEYS_ATTRIBUTE);
  element.removeAttribute(STATE_ATTRIBUTE);
  element.removeAttribute(HARDCODED_ATTRIBUTE);
}

function setAttribute(element: Element, name: string, value: string): void {
  if (element.getAttribute(name) !== value) element.setAttribute(name, value);
}
