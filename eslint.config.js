import { defineConfig, globalIgnores } from 'eslint/config';
import { globals } from 'eslint-config-zakodium';
import react from 'eslint-config-zakodium/react';
import ts from 'eslint-config-zakodium/ts';
import unicorn from 'eslint-config-zakodium/unicorn';

export default defineConfig(
  globalIgnores([
    '**/dist',
    '**/coverage',
    'frontend/playwright-report',
    'frontend/test-results',
  ]),
  ts,
  unicorn,
  {
    // TypeBox uses uppercase non-constructor calls: Type.Object(), Type.String()
    rules: { 'new-cap': ['error', { capIsNew: false }] },
  },
  { files: ['backend/**'], languageOptions: { globals: globals.nodeBuiltin } },
  { files: ['frontend/**'], extends: [react] },
);
