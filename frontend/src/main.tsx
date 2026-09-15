/**
 * Browser entry point: the stylesheets, the React root, and nothing else.
 */

import '@blueprintjs/core/lib/css/blueprint.css';
import '@blueprintjs/icons/lib/css/blueprint-icons.css';
import './index.css';

import { FocusStyleManager } from '@blueprintjs/core';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import App from './App.tsx';

FocusStyleManager.onlyShowFocusOnTabs();

const container = document.querySelector('#root');
if (container === null) {
  throw new Error(
    'translate.cheminfo.org cannot start: index.html has no <div id="root"></div> to mount into.',
  );
}

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
