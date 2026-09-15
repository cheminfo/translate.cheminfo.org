import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

/**
 * The overlay every site loads in translate mode: `dist/overlay.js`, with
 * React, Blueprint and its CSS inside, since the page loading it may use none
 * of them. It is built as an application rather than a library so it is
 * minified and tree-shaken like one, and it writes beside the admin page.
 */
export default defineConfig({
  plugins: [react()],
  build: {
    target: 'es2022',
    emptyOutDir: false,
    copyPublicDir: false,
    rolldownOptions: {
      input: 'src/overlay/standalone.tsx',
      output: {
        format: 'es',
        entryFileNames: 'overlay.js',
        chunkFileNames: 'overlay/[name]-[hash].js',
        assetFileNames: 'overlay/[name]-[hash][extname]',
      },
    },
  },
});
