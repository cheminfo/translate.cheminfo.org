import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// Derived from the project creation date (2026-09-14): 6·09·14 gives 60914,
// over 60000, so 10914. The dev server sits one port above the backend.
const backendPort = Number(process.env.PORT ?? 10_914);
const devServerPort = Number(process.env.VITE_PORT ?? backendPort + 1);

export default defineConfig({
  plugins: [react()],
  build: {
    target: 'esnext',
  },
  server: {
    port: devServerPort,
    // Fail loudly instead of drifting to the next free port, which would leave
    // the proxy target, the dev script and the README disagreeing.
    strictPort: true,
    proxy: {
      '/v1': `http://localhost:${backendPort}`,
      '/docs': `http://localhost:${backendPort}`,
    },
  },
  preview: {
    port: devServerPort,
    strictPort: true,
  },
});
