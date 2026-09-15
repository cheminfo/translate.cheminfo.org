// tokens-ok: file — the outlines are drawn over pages of any site, in status colours that are not a site's palette.

import {
  HARDCODED_ATTRIBUTE,
  KEYS_ATTRIBUTE,
  STATE_ATTRIBUTE,
} from './annotatePage.ts';

/** On the page's root element while the overlay runs. */
export const TRANSLATING_CLASS = 'cheminfo-translating';

/** On the page's root element while Alt is held. */
export const INSPECTING_CLASS = 'cheminfo-translate-inspecting';

const ROOT = `html.${TRANSLATING_CLASS}`;

const PAGE_CSS = `
${ROOT} [${KEYS_ATTRIBUTE}] {
  outline: 1px dashed rgb(45 114 210 / 45%);
  outline-offset: 1px;
}
${ROOT} [${STATE_ATTRIBUTE}='missing'] {
  outline-color: rgb(200 118 25 / 80%);
}
${ROOT} [${STATE_ATTRIBUTE}='draft'] {
  outline: 1px solid rgb(35 133 81 / 85%);
}
${ROOT} [${STATE_ATTRIBUTE}='invalid'] {
  outline: 2px solid rgb(205 66 70 / 90%);
}
${ROOT} [${HARDCODED_ATTRIBUTE}] {
  outline: 1px dotted rgb(205 66 70 / 70%);
  outline-offset: 1px;
}
html.${INSPECTING_CLASS} [${KEYS_ATTRIBUTE}] {
  cursor: crosshair;
  outline-width: 2px;
}
`;

/**
 * Add the outlines to the page the overlay runs on. They live in the page's
 * own head because the elements they outline are outside the overlay's shadow
 * root.
 * @param document - The page.
 * @returns The function that removes them again.
 */
export function installPageStyle(document: Document): () => void {
  const style = document.createElement('style');
  style.dataset.translateOverlay = '';
  style.textContent = PAGE_CSS;
  document.head.append(style);
  document.documentElement.classList.add(TRANSLATING_CLASS);
  return () => {
    style.remove();
    document.documentElement.classList.remove(
      TRANSLATING_CLASS,
      INSPECTING_CLASS,
    );
  };
}
