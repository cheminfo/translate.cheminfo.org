import type { MessageRef } from 'translate-core';
import { readMarkers } from 'translate-core';

/** The attributes a message can be rendered into and still be found. */
export const SCANNED_ATTRIBUTES = [
  'title',
  'placeholder',
  'aria-label',
  'aria-description',
  'alt',
  'label',
  'value',
] as const;

/** Elements whose text is never a message: code, and what is not shown. */
const SKIPPED_ELEMENTS = new Set([
  'SCRIPT',
  'STYLE',
  'NOSCRIPT',
  'TEMPLATE',
  'CODE',
  'PRE',
  'KBD',
  'SAMP',
  'TEXTAREA',
]);

/** Two letters in a row: text a reader would want translated. */
const WORDS = /\p{L}{2}/u;

/** One message found on the page. */
export interface FoundMessage {
  /** Which message. */
  ref: MessageRef;
  /** The element showing it. */
  element: Element;
  /**
   * The attribute it is rendered into; `undefined` for text content.
   * @default undefined
   */
  attribute?: string;
}

/** What a scan of the page found. */
export interface PageScan {
  /** Every element showing at least one message, with those messages. */
  elements: Map<Element, MessageRef[]>;
  /** Every message found, one entry per place it is shown. */
  found: FoundMessage[];
  /** The messages on the page, as `catalogId:key`. */
  names: Set<string>;
  /** Elements holding text that no message produced: not translatable yet. */
  hardcoded: Element[];
}

/** A scan that found nothing, before the first one ran. */
export const EMPTY_SCAN: PageScan = {
  elements: new Map(),
  found: [],
  names: new Set(),
  hardcoded: [],
};

/**
 * Find every message on a page by the markers its text and attributes carry,
 * and every visible text that carries none.
 *
 * Nothing about the page has to be prepared for it: a string formatted in
 * translate mode is found wherever it ended up. Elements marked
 * `translate="no"` — the HTML attribute for names, formulas and code — are
 * skipped with everything inside them.
 * @param root - Where to start, usually `document.body`.
 * @param resolve - The message a marker id stands for.
 * @param ignored - A subtree never scanned: the overlay's own host.
 * @returns What was found.
 */
export function scanPage(
  root: Element,
  resolve: (id: number) => MessageRef | undefined,
  ignored?: Node,
): PageScan {
  const scan: PageScan = {
    elements: new Map(),
    found: [],
    names: new Set(),
    hardcoded: [],
  };
  const hardcoded = new Set<Element>();
  const document = root.ownerDocument;
  const walker = document.createTreeWalker(
    root,
    NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT,
    {
      acceptNode(node) {
        if (node === ignored) return NodeFilter.FILTER_REJECT;
        if (node.nodeType === Node.ELEMENT_NODE && isSkipped(node as Element)) {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      },
    },
  );

  const record = (element: Element, id: number, attribute?: string) => {
    const ref = resolve(id);
    if (ref === undefined) return;
    const refs = scan.elements.get(element) ?? [];
    if (!refs.some((known) => sameRef(known, ref))) refs.push(ref);
    scan.elements.set(element, refs);
    scan.found.push(
      attribute === undefined ? { ref, element } : { ref, element, attribute },
    );
    scan.names.add(refName(ref));
  };

  for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
    if (node.nodeType === Node.TEXT_NODE) {
      const parent = node.parentElement;
      const text = node.nodeValue ?? '';
      if (parent === null) continue;
      const ids = readMarkers(text);
      if (ids.length === 0) {
        if (WORDS.test(text)) hardcoded.add(parent);
        continue;
      }
      for (const id of ids) record(parent, id);
    } else {
      const element = node as Element;
      for (const attribute of SCANNED_ATTRIBUTES) {
        const value = element.getAttribute(attribute);
        if (value === null) continue;
        for (const id of readMarkers(value)) record(element, id, attribute);
      }
    }
  }

  scan.hardcoded = [...hardcoded];
  return scan;
}

/**
 * How a message is named in attributes and in the list: `catalogId:key`.
 * @param ref - The message.
 * @returns Its name.
 */
export function refName(ref: MessageRef): string {
  return `${ref.catalogId}:${ref.key}`;
}

function sameRef(a: MessageRef, b: MessageRef): boolean {
  return a.catalogId === b.catalogId && a.key === b.key;
}

function isSkipped(element: Element): boolean {
  return (
    SKIPPED_ELEMENTS.has(element.tagName.toUpperCase()) ||
    element.getAttribute('translate') === 'no'
  );
}
