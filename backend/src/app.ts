import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import type { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import Fastify from 'fastify';

import healthRoutes from './routes/health.ts';
import type { FastifyTyped } from './types.ts';
import { registerFrontend } from './utils/frontend.ts';
import type { ContributionRouteSettings } from './v1/contributions.ts';
import v1 from './v1/v1.ts';

export interface BuildAppOptions {
  /**
   * The reverse proxies whose `X-Forwarded-For` is believed. The contribution
   * rate limit counts per client address, so behind a proxy this must name it.
   * @default false
   */
  trustProxy?: boolean | string;
  /**
   * Directory holding the built admin page and `overlay.js`. When absent, only
   * the API is served.
   * @default undefined
   */
  frontendRoot?: string;
  /**
   * How contributions are turned into pull requests. When absent, the
   * contribution endpoint answers 503.
   * @default undefined
   */
  contributions?: ContributionRouteSettings;
  /**
   * Whether Fastify logs requests.
   * @default false
   */
  logger?: boolean;
}

/**
 * Build and configure the Fastify application.
 * @param options - Deployment-dependent settings, all optional so tests can
 * build a bare API instance.
 * @returns Configured Fastify instance.
 */
export default async function buildApp(options: BuildAppOptions = {}) {
  const {
    trustProxy = false,
    frontendRoot,
    contributions,
    logger = false,
  } = options;

  const fastify: FastifyTyped = Fastify({
    logger,
    trustProxy,
    bodyLimit: 4 * 1024 * 1024,
  }).withTypeProvider<TypeBoxTypeProvider>();

  await fastify.register(swagger, {
    openapi: {
      info: {
        title: 'translate.cheminfo.org',
        description:
          'Checks the translations made with the overlay of the cheminfo sites, and opens them as pull requests.',
        version: '1.0.0',
      },
    },
  });
  await fastify.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: { docExpansion: 'list', deepLinking: false },
  });

  // Every site of the family posts here from its own origin, and the overlay
  // script is loaded cross-origin as a module; no credentials are ever sent.
  await fastify.register(cors, { origin: '*', maxAge: 86_400 });
  await fastify.register(rateLimit, { global: false });

  await fastify.register(healthRoutes);
  await fastify.register(v1, { contributions });

  if (frontendRoot) registerFrontend(fastify, frontendRoot);

  await fastify.ready();
  return fastify;
}
