import { expect, test } from 'vitest';

import { readContinuation, signContinuation } from '../continuation.ts';

const SECRET = 'f'.repeat(64);
const PULL_REQUEST = {
  repository: 'cheminfo/translate.cheminfo.org',
  number: 12,
};

test('a token names its pull request and reads back as it', async () => {
  const token = await signContinuation(SECRET, PULL_REQUEST);
  expect(token).toMatch(/^cheminfo\/translate\.cheminfo\.org#12\.[\da-f]{64}$/);
  expect(await readContinuation(SECRET, token)).toStrictEqual(PULL_REQUEST);
});

test('a token pointed at another pull request is refused', async () => {
  const token = await signContinuation(SECRET, PULL_REQUEST);
  expect(
    await readContinuation(SECRET, token.replace('#12.', '#13.')),
  ).toBeUndefined();
});

test('a token signed with another secret is refused', async () => {
  const token = await signContinuation('e'.repeat(64), PULL_REQUEST);
  expect(await readContinuation(SECRET, token)).toBeUndefined();
});

test('a string that is not a token is refused', async () => {
  expect(await readContinuation(SECRET, 'garbage')).toBeUndefined();
  expect(
    await readContinuation(SECRET, `owner/repo#0.${'a'.repeat(64)}`),
  ).toBeUndefined();
});
