import { Type } from '@sinclair/typebox';

import type { FastifyTyped } from '../types.ts';

/**
 * Register the health-check route the deploy script probes.
 * @param fastify - The Fastify instance to register routes on.
 */
export default async function healthRoutes(fastify: FastifyTyped) {
  fastify.get(
    '/v1/health',
    {
      schema: {
        tags: ['health'],
        summary: 'Liveness probe',
        response: {
          200: Type.Object({ status: Type.Literal('ok') }),
        },
      },
    },
    async () => ({ status: 'ok' }) as const,
  );
}
