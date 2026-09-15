/* eslint-disable camelcase -- the fake GitHub answers with the REST API's own snake_case payloads */

import { expect, test } from 'vitest';

import { OctokitHost } from '../OctokitHost.ts';

interface Reply {
  status?: number;
  body: unknown;
  type?: string;
}

interface Recorded {
  method: string;
  path: string;
  search: string;
  body: unknown;
}

const REPOSITORY = { owner: 'cheminfo', repo: 'periodic-table' };
const REPOSITORY_JSON = {
  private: false,
  default_branch: 'main',
  permissions: { push: true },
};

function fakeGitHub(routes: Record<string, Reply | Reply[]>) {
  const requests: Recorded[] = [];
  const fetch = async (input: unknown, init?: RequestInit) => {
    const url = new URL(String(input));
    const method = init?.method ?? 'GET';
    const path = decodeURIComponent(url.pathname);
    requests.push({
      method,
      path,
      search: url.search,
      body: typeof init?.body === 'string' ? JSON.parse(init.body) : undefined,
    });
    const route = routes[`${method} ${path}`];
    const reply = Array.isArray(route)
      ? route.length > 1
        ? route.shift()
        : route[0]
      : route;
    if (reply === undefined) {
      return Response.json({ message: 'Not Found' }, { status: 404 });
    }
    const text =
      typeof reply.body === 'string' ? reply.body : JSON.stringify(reply.body);
    return new Response(text, {
      status: reply.status ?? 200,
      headers: { 'content-type': reply.type ?? 'application/json' },
    });
  };
  const host = new OctokitHost({
    token: 'token',
    fetch,
    forkPollInterval: 0,
    forkPollAttempts: 2,
  });
  return { host, requests };
}

test('a repository is described by its default branch and push access', async () => {
  const { host } = fakeGitHub({
    'GET /repos/cheminfo/periodic-table': { body: REPOSITORY_JSON },
    'GET /repos/cheminfo/secret': {
      body: { ...REPOSITORY_JSON, private: true },
    },
  });
  expect(await host.describe(REPOSITORY)).toStrictEqual({
    defaultBranch: 'main',
    canPush: true,
  });
  expect(
    await host.describe({ owner: 'cheminfo', repo: 'secret' }),
  ).toBeUndefined();
  expect(
    await host.describe({ owner: 'cheminfo', repo: 'missing' }),
  ).toBeUndefined();
});

test('a server error is not mistaken for a missing repository', async () => {
  const { host } = fakeGitHub({
    'GET /repos/cheminfo/periodic-table': {
      status: 500,
      body: { message: 'boom' },
    },
  });
  await expect(host.describe(REPOSITORY)).rejects.toThrow('boom');
});

test('a file is read raw at a ref, as text or as bytes', async () => {
  const { host, requests } = fakeGitHub({
    'GET /repos/cheminfo/periodic-table/contents/src/locales/en.json': {
      body: '{"title":"Periodic table"}',
      type: 'text/plain; charset=utf-8',
    },
    'GET /repos/cheminfo/periodic-table/contents/src/locales/fr.json': {
      body: '{"title":"Tableau périodique"}',
      type: 'application/vnd.github.raw',
    },
  });
  expect(await host.readFile(REPOSITORY, 'src/locales/en.json', 'main')).toBe(
    '{"title":"Periodic table"}',
  );
  expect(await host.readFile(REPOSITORY, 'src/locales/fr.json', 'main')).toBe(
    '{"title":"Tableau périodique"}',
  );
  expect(
    await host.readFile(REPOSITORY, 'src/locales/de.json', 'main'),
  ).toBeUndefined();
  expect(requests[0]?.search).toBe('?ref=main');
});

test('a commit is one tree and one commit on top of the branch', async () => {
  const { host, requests } = fakeGitHub({
    'GET /repos/cheminfo/periodic-table/git/ref/heads/translate/fr-1': {
      body: { object: { sha: 'head1' } },
    },
    'GET /repos/cheminfo/periodic-table/git/commits/head1': {
      body: { tree: { sha: 'tree1' } },
    },
    'POST /repos/cheminfo/periodic-table/git/trees': { body: { sha: 'tree2' } },
    'POST /repos/cheminfo/periodic-table/git/commits': {
      body: { sha: 'commit2' },
    },
    'PATCH /repos/cheminfo/periodic-table/git/refs/heads/translate/fr-1': {
      body: { object: { sha: 'commit2' } },
    },
  });
  await host.commit(
    REPOSITORY,
    'translate/fr-1',
    [{ path: 'src/locales/fr.json', content: '{}\n' }],
    'feat(i18n): translate',
  );
  expect(
    requests.map(({ method, path, body }) => ({ method, path, body })),
  ).toStrictEqual([
    {
      method: 'GET',
      path: '/repos/cheminfo/periodic-table/git/ref/heads/translate/fr-1',
      body: undefined,
    },
    {
      method: 'GET',
      path: '/repos/cheminfo/periodic-table/git/commits/head1',
      body: undefined,
    },
    {
      method: 'POST',
      path: '/repos/cheminfo/periodic-table/git/trees',
      body: {
        base_tree: 'tree1',
        tree: [
          {
            path: 'src/locales/fr.json',
            mode: '100644',
            type: 'blob',
            content: '{}\n',
          },
        ],
      },
    },
    {
      method: 'POST',
      path: '/repos/cheminfo/periodic-table/git/commits',
      body: {
        message: 'feat(i18n): translate',
        tree: 'tree2',
        parents: ['head1'],
      },
    },
    {
      method: 'PATCH',
      path: '/repos/cheminfo/periodic-table/git/refs/heads/translate/fr-1',
      body: { sha: 'commit2' },
    },
  ]);
});

test('a branch is created at a commit', async () => {
  const { host, requests } = fakeGitHub({
    'POST /repos/cheminfo/periodic-table/git/refs': { body: {} },
  });
  await host.createBranch(REPOSITORY, 'translate/fr-1', 'abc');
  expect(requests[0]?.body).toStrictEqual({
    ref: 'refs/heads/translate/fr-1',
    sha: 'abc',
  });
});

test('a pull request from a fork names the fork owner and lets maintainers edit', async () => {
  const { host, requests } = fakeGitHub({
    'POST /repos/cheminfo/periodic-table/pulls': {
      body: {
        number: 7,
        html_url: 'https://github.com/cheminfo/periodic-table/pull/7',
      },
    },
  });
  const common = {
    repository: REPOSITORY,
    base: 'main',
    branch: 'translate/fr-1',
    title: 'T',
    body: 'B',
  };

  expect(
    await host.openPullRequest({
      ...common,
      head: { owner: 'cheminfo-bot', repo: 'periodic-table' },
    }),
  ).toStrictEqual({
    number: 7,
    url: 'https://github.com/cheminfo/periodic-table/pull/7',
  });
  await host.openPullRequest({ ...common, head: REPOSITORY });

  expect(requests.map((request) => request.body)).toStrictEqual([
    {
      base: 'main',
      head: 'cheminfo-bot:translate/fr-1',
      title: 'T',
      body: 'B',
      maintainer_can_modify: true,
    },
    { base: 'main', head: 'translate/fr-1', title: 'T', body: 'B' },
  ]);
});

test('a new fork is waited for until it can be read', async () => {
  const { host, requests } = fakeGitHub({
    'POST /repos/cheminfo/periodic-table/forks': {
      body: { owner: { login: 'cheminfo-bot' }, name: 'periodic-table' },
    },
    'GET /repos/cheminfo-bot/periodic-table': [
      { status: 404, body: { message: 'Not Found' } },
      { body: REPOSITORY_JSON },
    ],
  });
  expect(await host.forkOf(REPOSITORY)).toStrictEqual({
    owner: 'cheminfo-bot',
    repo: 'periodic-table',
  });
  expect(
    requests.map((request) => `${request.method} ${request.path}`),
  ).toStrictEqual([
    'POST /repos/cheminfo/periodic-table/forks',
    'GET /repos/cheminfo-bot/periodic-table',
    'GET /repos/cheminfo-bot/periodic-table',
  ]);
});

test('a fork that never appears is an error', async () => {
  const { host } = fakeGitHub({
    'POST /repos/cheminfo/periodic-table/forks': {
      body: { owner: { login: 'cheminfo-bot' }, name: 'periodic-table' },
    },
  });
  await expect(host.forkOf(REPOSITORY)).rejects.toThrow(
    'the fork cheminfo-bot/periodic-table never became ready',
  );
});

test('a pull request is read with the branch and repository it comes from', async () => {
  const { host } = fakeGitHub({
    'GET /repos/cheminfo/periodic-table/pulls/3': {
      body: {
        number: 3,
        html_url: 'https://github.com/cheminfo/periodic-table/pull/3',
        state: 'closed',
        head: {
          ref: 'translate/fr-1',
          repo: { name: 'periodic-table', owner: { login: 'cheminfo-bot' } },
        },
      },
    },
  });
  expect(await host.pullRequest(REPOSITORY, 3)).toStrictEqual({
    number: 3,
    url: 'https://github.com/cheminfo/periodic-table/pull/3',
    state: 'closed',
    head: { owner: 'cheminfo-bot', repo: 'periodic-table' },
    branch: 'translate/fr-1',
  });
  expect(await host.pullRequest(REPOSITORY, 4)).toBeUndefined();
});
