import { defineConfig, devices } from '@playwright/test';

// The two ports this project owns, derived from its creation date (2026-09-14):
// the backend at 10914, the dev server one above it.
const backendPort = Number(process.env.PORT ?? 10_914);
const devServerPort = Number(process.env.VITE_PORT ?? backendPort + 1);
const baseURL = `http://localhost:${devServerPort}`;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [['list'], ['html']] : 'list',
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: [
    {
      // No GITHUB_TOKEN: the suite checks that submitting is refused cleanly,
      // and never opens a real pull request.
      command: 'node src/server.ts',
      url: `http://localhost:${backendPort}/v1/health`,
      reuseExistingServer: !process.env.CI,
      cwd: '../backend',
      env: { GITHUB_TOKEN: '' },
    },
    {
      command: 'npm run dev',
      url: baseURL,
      reuseExistingServer: !process.env.CI,
    },
  ],
});
