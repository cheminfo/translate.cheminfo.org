import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // `e2e` is Playwright's, and its specs throw when vitest imports them.
    exclude: [...configDefaults.exclude, 'e2e/**'],
    coverage: {
      include: ['src/**/*.{ts,tsx}'],
      provider: 'v8',
    },
    snapshotFormat: {
      maxOutputLength: Number.MAX_SAFE_INTEGER,
    },
  },
});
