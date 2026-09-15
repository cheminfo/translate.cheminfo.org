import { expect, test } from 'vitest';

import { mergeContinuations } from '../overlayStore.ts';

test('one continuation is kept per repository, the latest one', () => {
  expect(
    mergeContinuations(['cheminfo/a#1.x', 'cheminfo/b#2.y'], {
      pullRequests: [
        {
          repository: 'Cheminfo/A',
          number: 3,
          url: 'https://github.com/Cheminfo/A/pull/3',
          messageCount: 1,
          updated: false,
          continuation: 'Cheminfo/A#3.z',
        },
      ],
    }),
  ).toStrictEqual(['Cheminfo/A#3.z', 'cheminfo/b#2.y']);
});
