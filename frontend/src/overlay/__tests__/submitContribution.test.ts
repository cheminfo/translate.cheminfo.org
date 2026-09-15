import type { Contribution } from 'translate-core';
import { expect, test } from 'vitest';

import { submitContribution } from '../submitContribution.ts';

const ORIGIN = 'https://translate.cheminfo.org';

const CONTRIBUTION: Contribution = {
  locale: 'fr',
  catalogs: [
    {
      repository: 'cheminfo/site',
      directory: 'src/locales',
      messages: { title: 'Titre' },
    },
  ],
};

function answering(response: () => Response) {
  const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
  const fetch = async (url: unknown, init?: RequestInit) => {
    calls.push({ url: String(url), init });
    return response();
  };
  return { fetch: fetch as typeof globalThis.fetch, calls };
}

test('a submission is posted as JSON and answers the pull requests', async () => {
  const result = {
    pullRequests: [
      {
        repository: 'cheminfo/site',
        number: 4,
        url: 'https://github.com/cheminfo/site/pull/4',
        messageCount: 1,
        updated: false,
        continuation: 'cheminfo/site#4.abc',
      },
    ],
  };
  const { fetch, calls } = answering(() => Response.json(result));

  expect(await submitContribution(ORIGIN, CONTRIBUTION, fetch)).toStrictEqual({
    kind: 'submitted',
    result,
  });
  expect(calls[0]?.url).toBe('https://translate.cheminfo.org/v1/contributions');
  expect(calls[0]?.init?.method).toBe('POST');
  const body = calls[0]?.init?.body;
  expect(typeof body === 'string' ? JSON.parse(body) : body).toStrictEqual(
    CONTRIBUTION,
  );
});

test('a refusal carries the problems', async () => {
  const problems = [
    {
      repository: 'cheminfo/site',
      directory: 'src/locales',
      key: 'title',
      message: 'The translation is empty.',
    },
  ];
  const { fetch } = answering(() =>
    Response.json(
      { error: 'The contribution was refused.', problems },
      { status: 422 },
    ),
  );
  expect(await submitContribution(ORIGIN, CONTRIBUTION, fetch)).toStrictEqual({
    kind: 'rejected',
    error: 'The contribution was refused.',
    problems,
  });
});

test('a rate limit, a server error and an unreachable server are worded for the translator', async () => {
  expect(
    await submitContribution(
      ORIGIN,
      CONTRIBUTION,
      answering(() => Response.json({ message: 'slow down' }, { status: 429 }))
        .fetch,
    ),
  ).toStrictEqual({
    kind: 'failed',
    error: 'Too many submissions from this address; try again in an hour.',
  });
  expect(
    await submitContribution(
      ORIGIN,
      CONTRIBUTION,
      answering(() =>
        Response.json({ error: 'Submitting is off.' }, { status: 503 }),
      ).fetch,
    ),
  ).toStrictEqual({ kind: 'failed', error: 'Submitting is off.' });
  expect(
    await submitContribution(
      ORIGIN,
      CONTRIBUTION,
      answering(() => new Response('oops', { status: 500 })).fetch,
    ),
  ).toStrictEqual({
    kind: 'failed',
    error: 'The translation server answered 500.',
  });
  expect(
    await submitContribution(ORIGIN, CONTRIBUTION, () =>
      Promise.reject(new TypeError('offline')),
    ),
  ).toStrictEqual({
    kind: 'failed',
    error: 'The translation server could not be reached.',
  });
});
