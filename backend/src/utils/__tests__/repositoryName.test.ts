import { expect, test } from 'vitest';

import {
  formatRepository,
  isRepositoryAllowed,
  parseAllowedRepositories,
  parseRepositoryName,
} from '../repositoryName.ts';

test('an owner/repo string reads as its two parts', () => {
  expect(parseRepositoryName('cheminfo/translate.cheminfo.org')).toStrictEqual({
    owner: 'cheminfo',
    repo: 'translate.cheminfo.org',
  });
  expect(formatRepository({ owner: 'mljs', repo: 'matrix' })).toBe(
    'mljs/matrix',
  );
});

test('anything but owner/repo is not a repository', () => {
  expect(parseRepositoryName('cheminfo')).toBeUndefined();
  expect(parseRepositoryName('a/b/c')).toBeUndefined();
  expect(parseRepositoryName('cheminfo/..')).toBeUndefined();
  expect(parseRepositoryName('-bad/repo')).toBeUndefined();
  expect(
    parseRepositoryName('https://github.com/cheminfo/smiles'),
  ).toBeUndefined();
});

test('an owner pattern allows every repository of the owner, whatever the case', () => {
  const patterns = ['cheminfo/*', 'mljs/matrix'];
  expect(isRepositoryAllowed({ owner: 'Cheminfo', repo: 'X' }, patterns)).toBe(
    true,
  );
  expect(isRepositoryAllowed({ owner: 'mljs', repo: 'Matrix' }, patterns)).toBe(
    true,
  );
  expect(isRepositoryAllowed({ owner: 'mljs', repo: 'pls' }, patterns)).toBe(
    false,
  );
});

test('the allowed list is comma separated, blanks dropped', () => {
  expect(
    parseAllowedRepositories(' cheminfo/* , mljs/matrix ,, '),
  ).toStrictEqual(['cheminfo/*', 'mljs/matrix']);
});
