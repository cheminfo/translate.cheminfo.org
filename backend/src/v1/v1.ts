import type { FastifyTyped } from '../types.ts';

import type { ContributionRoutesOptions } from './contributions.ts';
import contributionRoutes from './contributions.ts';

/**
 * Register every `/v1` route but the health probe.
 * @param fastify - The Fastify instance to register routes on.
 * @param options - What the routes need from the deployment.
 */
export default async function v1(
  fastify: FastifyTyped,
  options: ContributionRoutesOptions,
) {
  await fastify.register(contributionRoutes, options);
}
