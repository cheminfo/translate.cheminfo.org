import { BlueprintProvider } from '@blueprintjs/core';
import blueprintCss from '@blueprintjs/core/lib/css/blueprint.css?inline';
import { StrictMode } from 'react';
import type { TranslateBridge } from 'react-cheminfo/translate';
import { BRIDGE_PROTOCOL } from 'react-cheminfo/translate';
import { createRoot } from 'react-dom/client';

import { Overlay } from './Overlay.tsx';
import overlayCss from './overlay.css?inline';
import { restoreDrafts } from './overlayStore.ts';
import { installPageStyle } from './pageStyle.ts';

/** How the overlay is started. */
export interface MountOverlayOptions {
  /** Where the translation server is, e.g. `https://translate.cheminfo.org`. */
  apiOrigin: string;
}

/**
 * Start the overlay on a page in translate mode.
 *
 * It renders into a shadow root, so neither the page's CSS reaches the overlay
 * nor the overlay's — Blueprint included — reaches the page. Only the outlines
 * of the translatable elements are added to the page itself.
 * @param bridge - The page's session.
 * @param options - Where the translation server is.
 * @returns The function that removes the overlay and its outlines.
 * @throws {Error} When the page speaks another protocol version.
 */
export function mountOverlay(
  bridge: TranslateBridge,
  options: MountOverlayOptions,
): () => void {
  const protocol: unknown = bridge.protocol;
  if (protocol !== BRIDGE_PROTOCOL) {
    throw new Error(
      `this overlay speaks protocol ${BRIDGE_PROTOCOL}, the page speaks ${String(protocol)}`,
    );
  }

  const host = document.createElement('div');
  host.dataset.translateOverlay = '';
  host.setAttribute('translate', 'no');
  document.body.append(host);

  const shadow = host.attachShadow({ mode: 'open' });
  const style = document.createElement('style');
  // Blueprint's icon font stylesheet is left out: its components draw icons as
  // SVG, and a font URL in a shadow root would resolve against the site.
  style.textContent = `${blueprintCss}\n${overlayCss}`;
  const container = document.createElement('div');
  container.className = 'translate-overlay';
  shadow.append(style, container);

  const removePageStyle = installPageStyle(document);
  restoreDrafts(bridge);

  const root = createRoot(container);
  root.render(
    <StrictMode>
      <BlueprintProvider portalContainer={container}>
        <Overlay bridge={bridge} apiOrigin={options.apiOrigin} host={host} />
      </BlueprintProvider>
    </StrictMode>,
  );

  return () => {
    root.unmount();
    host.remove();
    removePageStyle();
  };
}
