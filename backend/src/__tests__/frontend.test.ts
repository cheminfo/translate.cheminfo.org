import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, beforeAll, expect, test } from 'vitest';

import buildApp from '../app.ts';

const INDEX =
  '<!doctype html><html><head><meta name="robots" content="noindex, nofollow" /></head><body><div id="root"></div></body></html>';

let app: Awaited<ReturnType<typeof buildApp>>;

beforeAll(async () => {
  const root = mkdtempSync(join(tmpdir(), 'translate-frontend-'));
  writeFileSync(join(root, 'index.html'), INDEX);
  writeFileSync(join(root, 'overlay.js'), 'export {};\n');
  app = await buildApp({ frontendRoot: root });
});

afterAll(async () => {
  await app.close();
});

test('the admin page is served, and asks not to be indexed', async () => {
  const response = await app.inject({ method: 'GET', url: '/' });
  expect(response.statusCode).toBe(200);
  expect(response.body).toBe(INDEX);
  expect(response.headers['x-robots-tag']).toBe('noindex, nofollow');
});

test('an address the app routes itself is served the same page', async () => {
  const response = await app.inject({ method: 'GET', url: '/launch' });
  expect(response.statusCode).toBe(200);
  expect(response.body).toBe(INDEX);
});

test('robots.txt disallows everything', async () => {
  const response = await app.inject({ method: 'GET', url: '/robots.txt' });
  expect(response.body).toBe('User-agent: *\nDisallow: /\n');
});

test('an unknown API address is a 404 rather than a page', async () => {
  const response = await app.inject({ method: 'GET', url: '/v1/nope' });
  expect(response.statusCode).toBe(404);
  expect(response.json()).toStrictEqual({ error: 'Not found' });
});

test('the overlay script can be loaded from any site, and is briefly cached', async () => {
  const response = await app.inject({
    method: 'GET',
    url: '/overlay.js',
    headers: { origin: 'https://smiles.cheminfo.org' },
  });
  expect(response.statusCode).toBe(200);
  expect(response.headers['access-control-allow-origin']).toBe('*');
  expect(response.headers['cache-control']).toBe('public, max-age=300');
  expect(response.headers['cross-origin-resource-policy']).toBe('cross-origin');
});
