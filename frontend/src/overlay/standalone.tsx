/**
 * The entry point of `overlay.js`, the script a site in translate mode loads
 * from translate.cheminfo.org. The site has already exposed its session as
 * `window.__cheminfoTranslate`; the overlay talks to the server it was loaded
 * from.
 */

import type { TranslateBridge } from 'translate-core';
import { BRIDGE_GLOBAL, BRIDGE_PROTOCOL } from 'translate-core';

import { mountOverlay } from './mountOverlay.tsx';

const bridge = (globalThis as Record<string, unknown>)[BRIDGE_GLOBAL] as
  TranslateBridge | undefined;

if (bridge?.protocol === BRIDGE_PROTOCOL) {
  mountOverlay(bridge, { apiOrigin: new URL(import.meta.url).origin });
}
