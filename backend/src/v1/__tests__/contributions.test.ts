import { expect, test } from 'vitest';

import buildApp from '../../app.ts';
import { FakeHost } from '../../contributions/__tests__/FakeHost.ts';

const REPOSITORY = 'cheminfo/periodic-table';

function body(messages: Record<string, string>) {
  return {
    locale: 'fr',
    catalogs: [{ repository: REPOSITORY, directory: 'src/locales', messages }],
  };
}

async function configuredApp(perHour = 10) {
  const host = new FakeHost();
  host.addRepository(REPOSITORY, {
    files: { 'src/locales/en.json': '{"title":"Periodic table"}' },
  });
  const app = await buildApp({
    contributions: {
      host,
      secret: 'd'.repeat(64),
      allowedRepositories: ['cheminfo/*'],
      perHour,
      branchSuffix: () => 'x',
    },
  });
  return { app, host };
}

test('without GitHub settings the endpoint says submitting is off', async () => {
  const app = await buildApp();
  const response = await app.inject({
    method: 'POST',
    url: '/v1/contributions',
    payload: body({ title: 'Tableau périodique' }),
  });
  expect(response.statusCode).toBe(503);
  expect(response.json()).toStrictEqual({
    error:
      'Submitting is not configured on this server; download the translation instead.',
  });
  await app.close();
});

test('a valid contribution answers the pull request it opened', async () => {
  const { app } = await configuredApp();
  const response = await app.inject({
    method: 'POST',
    url: '/v1/contributions',
    payload: body({ title: 'Tableau périodique' }),
  });
  expect(response.statusCode).toBe(200);
  const result = response.json<{ pullRequests: Array<{ url: string }> }>();
  expect(result.pullRequests.map((pr) => pr.url)).toStrictEqual([
    'https://github.com/cheminfo/periodic-table/pull/1',
  ]);
  await app.close();
});

test('a message that fails its check answers 422 with the problem', async () => {
  const { app, host } = await configuredApp();
  const response = await app.inject({
    method: 'POST',
    url: '/v1/contributions',
    payload: body({ title: ' ' }),
  });
  expect(response.statusCode).toBe(422);
  expect(response.json()).toStrictEqual({
    error: 'The contribution was refused.',
    problems: [
      {
        repository: REPOSITORY,
        directory: 'src/locales',
        key: 'title',
        message: 'The translation is empty.',
      },
    ],
  });
  expect(host.pullRequests).toStrictEqual([]);
  await app.close();
});

test('a body that is not a contribution is refused by the schema', async () => {
  const { app } = await configuredApp();
  const response = await app.inject({
    method: 'POST',
    url: '/v1/contributions',
    payload: { locale: 'fr', extra: true },
  });
  expect(response.statusCode).toBe(400);
  await app.close();
});

test('a GitHub failure answers 502 and keeps the edits in the overlay', async () => {
  const { app, host } = await configuredApp();
  host.failOn = 'openPullRequest';
  const response = await app.inject({
    method: 'POST',
    url: '/v1/contributions',
    payload: body({ title: 'Tableau périodique' }),
  });
  expect(response.statusCode).toBe(502);
  expect(response.json()).toStrictEqual({
    error:
      'GitHub refused the change. Your edits are still in the overlay; try again later.',
  });
  await app.close();
});

test('a client over its hourly budget is told to wait', async () => {
  const { app } = await configuredApp(1);
  const payload = body({ title: 'Tableau périodique' });
  const first = await app.inject({
    method: 'POST',
    url: '/v1/contributions',
    payload,
  });
  const second = await app.inject({
    method: 'POST',
    url: '/v1/contributions',
    payload,
  });
  expect(first.statusCode).toBe(200);
  expect(second.statusCode).toBe(429);
  await app.close();
});
