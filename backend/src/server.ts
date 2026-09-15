import { existsSync } from 'node:fs';
import { join } from 'node:path';

import buildApp from './app.ts';
import { DEFAULT_PORT } from './constants.ts';
import { parseTrustProxy } from './utils/parseTrustProxy.ts';
import { readContributionSettings } from './utils/readContributionSettings.ts';

const frontendDist = join(import.meta.dirname, '../../frontend/dist');
const contributions = readContributionSettings(process.env);

const fastify = await buildApp({
  trustProxy: parseTrustProxy(process.env.TRUST_PROXY),
  frontendRoot: existsSync(frontendDist) ? frontendDist : undefined,
  contributions,
  logger: true,
});

if (contributions === undefined) {
  fastify.log.warn(
    'GITHUB_TOKEN is unset: contributions are refused, the overlay only offers a download',
  );
}

const port = Number(process.env.PORT) || DEFAULT_PORT;
await fastify.listen({ port, host: process.env.HOST ?? '0.0.0.0' });
