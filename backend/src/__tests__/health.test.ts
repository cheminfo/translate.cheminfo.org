import { afterAll, beforeAll, expect, test } from 'vitest';

import buildApp from '../app.ts';

let app: Awaited<ReturnType<typeof buildApp>>;

beforeAll(async () => {
  app = await buildApp();
});

afterAll(async () => {
  await app.close();
});

test('the probe the deploy script reads answers ok', async () => {
  const response = await app.inject({ method: 'GET', url: '/v1/health' });
  expect(response.statusCode).toBe(200);
  expect(response.json()).toStrictEqual({ status: 'ok' });
});
