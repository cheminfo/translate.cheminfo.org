import { expect, test } from 'vitest';

import { OctokitHost } from '../../github/OctokitHost.ts';
import { readContributionSettings } from '../readContributionSettings.ts';

const SECRET = 'c'.repeat(64);

test('without a token submitting is disabled', () => {
  expect(readContributionSettings({})).toBeUndefined();
  expect(readContributionSettings({ GITHUB_TOKEN: '  ' })).toBeUndefined();
});

test('a token without a long enough secret is a configuration error', () => {
  expect(() =>
    readContributionSettings({
      GITHUB_TOKEN: 't',
      CONTRIBUTION_SECRET: 'short',
    }),
  ).toThrow(
    'CONTRIBUTION_SECRET must be at least 32 characters whenever GITHUB_TOKEN is set; generate one with: openssl rand -hex 32',
  );
});

test('the defaults allow the cheminfo repositories, twenty times an hour', () => {
  const settings = readContributionSettings({
    GITHUB_TOKEN: 't',
    CONTRIBUTION_SECRET: SECRET,
  });
  expect(settings?.host).toBeInstanceOf(OctokitHost);
  expect(settings?.secret).toBe(SECRET);
  expect(settings?.allowedRepositories).toStrictEqual(['cheminfo/*']);
  expect(settings?.perHour).toBe(20);
});

test('the allowed repositories and the rate are read from the environment', () => {
  const settings = readContributionSettings({
    GITHUB_TOKEN: 't',
    CONTRIBUTION_SECRET: SECRET,
    ALLOWED_REPOSITORIES: 'cheminfo/*, mljs/matrix',
    CONTRIBUTIONS_PER_HOUR: '5',
  });
  expect(settings?.allowedRepositories).toStrictEqual([
    'cheminfo/*',
    'mljs/matrix',
  ]);
  expect(settings?.perHour).toBe(5);
  expect(
    readContributionSettings({
      GITHUB_TOKEN: 't',
      CONTRIBUTION_SECRET: SECRET,
      CONTRIBUTIONS_PER_HOUR: '-3',
    })?.perHour,
  ).toBe(20);
});
