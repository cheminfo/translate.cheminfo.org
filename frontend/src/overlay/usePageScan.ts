import { useEffect, useEffectEvent, useRef, useState } from 'react';
import type { MessageRef, TranslateBridge } from 'react-cheminfo/translate';

import { annotatePage, clearAnnotations } from './annotatePage.ts';
import type { MessageStatus } from './messageStatus.ts';
import { INSPECTING_CLASS } from './pageStyle.ts';
import type { PageScan } from './scanPage.ts';
import { EMPTY_SCAN, SCANNED_ATTRIBUTES, scanPage } from './scanPage.ts';

/**
 * Scan the page for messages, and scan again after every change to it, at
 * most once a frame. The overlay's own annotations are not among the observed
 * attributes, so writing them does not trigger another scan.
 * @param bridge - The page's session.
 * @param host - The overlay's host element, never scanned.
 * @returns The latest scan.
 */
export function usePageScan(bridge: TranslateBridge, host: Element): PageScan {
  const [scan, setScan] = useState<PageScan>(EMPTY_SCAN);

  useEffect(() => {
    const { body } = host.ownerDocument;
    let frame = 0;
    const rescan = () => {
      if (frame !== 0) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        setScan(scanPage(body, (id) => bridge.resolveMarker(id), host));
      });
    };
    const observer = new MutationObserver(rescan);
    observer.observe(body, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: [...SCANNED_ATTRIBUTES],
    });
    rescan();
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [bridge, host]);

  return scan;
}

/**
 * Keep the page's annotations in step with the latest scan, and remove them
 * all when the overlay closes.
 * @param scan - The latest scan.
 * @param statusOf - The status of one message.
 */
export function useAnnotations(
  scan: PageScan,
  statusOf: (ref: MessageRef) => MessageStatus,
): void {
  const annotated = useRef(new Set<Element>());

  useEffect(() => {
    annotatePage(scan, statusOf, annotated.current);
  }, [scan, statusOf]);

  useEffect(() => {
    const elements = annotated.current;
    return () => {
      clearAnnotations(elements);
    };
  }, []);
}

/**
 * Alt-click picks the messages of the element under the pointer, and holding
 * Alt shows which elements can be picked. The click is swallowed only when it
 * lands on a message, so links and buttons elsewhere still work.
 * @param elements - The elements showing messages, from the latest scan.
 * @param onPick - Called with the messages of the element clicked.
 */
export function useAltClick(
  elements: Map<Element, MessageRef[]>,
  onPick: (refs: MessageRef[]) => void,
): void {
  const pick = useEffectEvent((event: MouseEvent) => {
    if (!event.altKey) return;
    for (const target of event.composedPath()) {
      if (!(target instanceof Element)) continue;
      const refs = elements.get(target);
      if (refs === undefined) continue;
      event.preventDefault();
      event.stopPropagation();
      onPick(refs);
      return;
    }
  });

  useEffect(() => {
    const root = document.documentElement;
    const onKey = (event: KeyboardEvent) => {
      root.classList.toggle(INSPECTING_CLASS, event.altKey);
    };
    const onBlur = () => {
      root.classList.remove(INSPECTING_CLASS);
    };
    document.addEventListener('click', pick, true);
    globalThis.addEventListener('keydown', onKey);
    globalThis.addEventListener('keyup', onKey);
    globalThis.addEventListener('blur', onBlur);
    return () => {
      document.removeEventListener('click', pick, true);
      globalThis.removeEventListener('keydown', onKey);
      globalThis.removeEventListener('keyup', onKey);
      globalThis.removeEventListener('blur', onBlur);
      onBlur();
    };
  }, []);
}
