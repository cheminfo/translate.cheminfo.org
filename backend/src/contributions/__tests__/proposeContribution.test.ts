import type { Contribution, Messages } from 'translate-core';
import { expect, test } from 'vitest';

import type { ContributionSettings } from '../proposeContribution.ts';
import {
  ContributionRejectedError,
  proposeContribution,
} from '../proposeContribution.ts';

import { FakeHost } from './FakeHost.ts';

const REPOSITORY = 'cheminfo/periodic-table';

const ENGLISH = {
  title: 'Periodic table',
  count: '{count, plural, one {# element} other {# elements}}',
  close: 'Close',
};

const FRENCH = {
  count: '{count, plural, one {# élément} other {# éléments}}',
  title: 'Tableau périodique',
  close: 'Fermer',
};

function setup(canPush = true) {
  const host = new FakeHost();
  host.addRepository(REPOSITORY, {
    canPush,
    files: {
      'src/locales/en.json': JSON.stringify(ENGLISH),
      'src/locales/fr.json': JSON.stringify({ close: 'Fermer' }),
    },
  });
  let branches = 0;
  const settings: ContributionSettings = {
    host,
    secret: 'a'.repeat(64),
    allowedRepositories: ['cheminfo/*'],
    branchSuffix: () => `b${++branches}`,
  };
  return { host, settings };
}

function contribution(
  messages: Messages,
  extra: Partial<Contribution> = {},
): Contribution {
  return {
    locale: 'fr',
    catalogs: [{ repository: REPOSITORY, directory: 'src/locales', messages }],
    ...extra,
  };
}

async function rejection(promise: Promise<unknown>) {
  const error = await promise.catch((error: unknown) => error);
  expect(error).toBeInstanceOf(ContributionRejectedError);
  return (error as ContributionRejectedError).problems;
}

test('with push access the branch is made in the repository and a PR opened', async () => {
  const { host, settings } = setup();
  const result = await proposeContribution(
    contribution(FRENCH, { contributor: 'Ada' }),
    settings,
  );

  expect(result).toStrictEqual({
    pullRequests: [
      {
        repository: REPOSITORY,
        number: 1,
        url: 'https://github.com/cheminfo/periodic-table/pull/1',
        messageCount: 2,
        updated: false,
        continuation: expect.stringMatching(
          /^cheminfo\/periodic-table#1\.[\da-f]{64}$/,
        ),
      },
    ],
  });
  expect(host.file(REPOSITORY, 'translate/fr-b1', 'src/locales/fr.json')).toBe(
    '{\n  "title": "Tableau périodique",\n  "count": "{count, plural, one {# élément} other {# éléments}}",\n  "close": "Fermer"\n}\n',
  );
  expect(host.file(REPOSITORY, 'main', 'src/locales/fr.json')).toBe(
    '{"close":"Fermer"}',
  );
  expect(host.forks).toStrictEqual([]);
  expect(host.commits).toStrictEqual([
    {
      repository: REPOSITORY,
      branch: 'translate/fr-b1',
      paths: ['src/locales/fr.json'],
      message:
        'feat(i18n): translate 2 messages into French\n\nSubmitted by Ada.\n',
    },
  ]);
  expect(host.pullRequests[0]).toMatchObject({
    base: 'main',
    branch: 'translate/fr-b1',
    head: { owner: 'cheminfo', repo: 'periodic-table' },
    title: 'feat(i18n): translate 2 messages into French',
  });
});

test('without push access the branch is made in the bot fork', async () => {
  const { host, settings } = setup(false);
  const result = await proposeContribution(contribution(FRENCH), settings);

  expect(result.pullRequests.map((pr) => pr.number)).toStrictEqual([1]);
  expect(host.forks).toStrictEqual([REPOSITORY]);
  expect(host.pullRequests[0]?.head).toStrictEqual({
    owner: 'cheminfo-bot',
    repo: 'periodic-table',
  });
  expect(host.branches(REPOSITORY)).toStrictEqual(['main']);
  expect(host.branches('cheminfo-bot/periodic-table')).toStrictEqual([
    'main',
    'translate/fr-b1',
  ]);
});

test('a continuation adds a commit to the open pull request', async () => {
  const { host, settings } = setup();
  const first = await proposeContribution(
    contribution({ title: 'Tableau périodique' }),
    settings,
  );
  const continuation = first.pullRequests[0]?.continuation ?? '';
  const second = await proposeContribution(
    contribution({ close: 'Clore' }, { continuations: [continuation] }),
    settings,
  );

  expect(second.pullRequests).toStrictEqual([
    {
      repository: REPOSITORY,
      number: 1,
      url: 'https://github.com/cheminfo/periodic-table/pull/1',
      messageCount: 1,
      updated: true,
      continuation,
    },
  ]);
  expect(host.pullRequests).toHaveLength(1);
  expect(host.file(REPOSITORY, 'translate/fr-b1', 'src/locales/fr.json')).toBe(
    '{\n  "title": "Tableau périodique",\n  "close": "Clore"\n}\n',
  );
});

test('a continuation of a closed pull request opens a new one', async () => {
  const { host, settings } = setup();
  const first = await proposeContribution(
    contribution({ title: 'Tableau périodique' }),
    settings,
  );
  host.closePullRequest(1);
  const second = await proposeContribution(
    contribution(
      { close: 'Clore' },
      { continuations: [first.pullRequests[0]?.continuation ?? ''] },
    ),
    settings,
  );

  expect(second.pullRequests[0]).toMatchObject({ number: 2, updated: false });
  expect(host.pullRequests[1]?.branch).toBe('translate/fr-b2');
});

test('a continuation the server did not sign is ignored', async () => {
  const { host, settings } = setup();
  await proposeContribution(contribution({ title: 'Tableau' }), settings);
  const forged = `${REPOSITORY}#1.${'0'.repeat(64)}`;
  const second = await proposeContribution(
    contribution({ close: 'Clore' }, { continuations: [forged] }),
    settings,
  );

  expect(second.pullRequests[0]?.number).toBe(2);
  expect(host.pullRequests).toHaveLength(2);
});

test('an unknown key or a dropped placeholder refuses everything', async () => {
  const { host, settings } = setup();
  const problems = await rejection(
    proposeContribution(
      contribution({
        title: 'Tableau',
        invented: 'Inventé',
        count: 'des éléments',
      }),
      settings,
    ),
  );

  expect(problems).toStrictEqual([
    {
      repository: REPOSITORY,
      directory: 'src/locales',
      key: 'invented',
      message: 'The English catalog has no such message.',
    },
    {
      repository: REPOSITORY,
      directory: 'src/locales',
      key: 'count',
      message: '{count} is in the English message but not in the translation.',
    },
  ]);
  expect(host.pullRequests).toStrictEqual([]);
  expect(host.branches(REPOSITORY)).toStrictEqual(['main']);
});

test('a repository not allowed, a bad directory or a repeated catalog is refused', async () => {
  const { settings } = setup();
  const problems = await rejection(
    proposeContribution(
      {
        locale: 'fr',
        catalogs: [
          { repository: 'mljs/matrix', directory: 'src/locales', messages: {} },
          { repository: REPOSITORY, directory: '../locales', messages: {} },
          { repository: 'not-a-repo', directory: 'src/locales', messages: {} },
          { repository: REPOSITORY, directory: 'src/locales', messages: {} },
          { repository: REPOSITORY, directory: 'src/locales', messages: {} },
        ],
      },
      settings,
    ),
  );

  expect(problems).toStrictEqual([
    {
      repository: 'mljs/matrix',
      directory: 'src/locales',
      message: 'This server does not open pull requests on that repository.',
    },
    {
      repository: REPOSITORY,
      directory: '../locales',
      message: 'A catalog directory is a relative path ending in "locales".',
    },
    {
      repository: 'not-a-repo',
      directory: 'src/locales',
      message: 'The repository must be written owner/repo.',
    },
    {
      repository: REPOSITORY,
      directory: 'src/locales',
      message: 'The same catalog is sent twice.',
    },
  ]);
});

test('English cannot be contributed', async () => {
  const { settings } = setup();
  const problems = await rejection(
    proposeContribution({ ...contribution(FRENCH), locale: 'en' }, settings),
  );
  expect(problems).toStrictEqual([
    {
      repository: '',
      directory: '',
      message: '"en" is not a locale a translation can be written in.',
    },
  ]);
});

test('a missing repository or English catalog is reported', async () => {
  const { settings } = setup();
  const problems = await rejection(
    proposeContribution(
      {
        locale: 'fr',
        catalogs: [
          {
            repository: 'cheminfo/unknown',
            directory: 'src/locales',
            messages: {},
          },
          { repository: REPOSITORY, directory: 'lib/locales', messages: {} },
        ],
      },
      settings,
    ),
  );
  expect(problems).toStrictEqual([
    {
      repository: 'cheminfo/unknown',
      directory: '',
      message: 'The repository does not exist or is not public.',
    },
    {
      repository: REPOSITORY,
      directory: 'lib/locales',
      message: 'There is no lib/locales/en.json on main.',
    },
  ]);
});

test('messages identical to the published ones open nothing', async () => {
  const { host, settings } = setup();
  expect(
    await proposeContribution(contribution({ close: 'Fermer' }), settings),
  ).toStrictEqual({ pullRequests: [] });
  expect(host.branches(REPOSITORY)).toStrictEqual(['main']);
});
