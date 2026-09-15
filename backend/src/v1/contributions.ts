import { Type } from '@sinclair/typebox';
import {
  MAX_CATALOGS,
  MAX_CONTRIBUTOR_LENGTH,
  MAX_MESSAGES_PER_CATALOG,
  MAX_MESSAGE_LENGTH,
  MAX_NOTE_LENGTH,
} from 'translate-core';

import type { ContributionSettings } from '../contributions/proposeContribution.ts';
import {
  ContributionRejectedError,
  proposeContribution,
} from '../contributions/proposeContribution.ts';
import type { FastifyTyped } from '../types.ts';

/** How the contribution route is set up. */
export interface ContributionRouteSettings extends ContributionSettings {
  /** How many contributions one client address may submit per hour. */
  perHour: number;
}

/** What the contribution routes need from the deployment. */
export interface ContributionRoutesOptions {
  /**
   * How contributions become pull requests; the route answers 503 without it.
   * @default undefined
   */
  contributions?: ContributionRouteSettings;
}

const ContributionCatalogSchema = Type.Object(
  {
    repository: Type.String({
      maxLength: 140,
      description: 'The repository the catalog lives in, `owner/repo`.',
    }),
    directory: Type.String({
      maxLength: 300,
      description: 'The catalog directory, e.g. `frontend/src/locales`.',
    }),
    messages: Type.Record(
      Type.String(),
      Type.String({ maxLength: MAX_MESSAGE_LENGTH }),
      { maxProperties: MAX_MESSAGES_PER_CATALOG },
    ),
  },
  { additionalProperties: false },
);

const ContributionSchema = Type.Object(
  {
    locale: Type.String({ minLength: 2, maxLength: 35 }),
    catalogs: Type.Array(ContributionCatalogSchema, {
      minItems: 1,
      maxItems: MAX_CATALOGS,
    }),
    contributor: Type.Optional(
      Type.String({ maxLength: MAX_CONTRIBUTOR_LENGTH }),
    ),
    note: Type.Optional(Type.String({ maxLength: MAX_NOTE_LENGTH })),
    continuations: Type.Optional(
      Type.Array(Type.String({ maxLength: 400 }), { maxItems: MAX_CATALOGS }),
    ),
  },
  { additionalProperties: false },
);

const PullRequestSchema = Type.Object({
  repository: Type.String(),
  number: Type.Integer(),
  url: Type.String(),
  messageCount: Type.Integer(),
  updated: Type.Boolean(),
  continuation: Type.String(),
});

const ProblemSchema = Type.Object({
  repository: Type.String(),
  directory: Type.String(),
  key: Type.Optional(Type.String()),
  message: Type.String(),
});

const ErrorSchema = Type.Object({ error: Type.String() });

/**
 * Register the route the overlay submits a translation to.
 * @param fastify - The Fastify instance to register routes on.
 * @param options - How contributions become pull requests.
 */
export default async function contributionRoutes(
  fastify: FastifyTyped,
  options: ContributionRoutesOptions,
) {
  const { contributions } = options;

  fastify.post(
    '/v1/contributions',
    {
      config: {
        rateLimit: {
          max: contributions?.perHour ?? 1,
          timeWindow: '1 hour',
        },
      },
      schema: {
        tags: ['contributions'],
        summary: 'Submit translated messages as pull requests',
        description:
          'Every message is checked against the English one in the repository; when all pass, one pull request is opened per repository, or added to when a continuation token names an open one.',
        body: ContributionSchema,
        response: {
          200: Type.Object({ pullRequests: Type.Array(PullRequestSchema) }),
          422: Type.Object({
            error: Type.String(),
            problems: Type.Array(ProblemSchema),
          }),
          502: ErrorSchema,
          503: ErrorSchema,
        },
      },
    },
    async (request, reply) => {
      if (contributions === undefined) {
        return reply.code(503).send({
          error:
            'Submitting is not configured on this server; download the translation instead.',
        });
      }
      try {
        return await proposeContribution(request.body, contributions);
      } catch (error) {
        if (error instanceof ContributionRejectedError) {
          return reply
            .code(422)
            .send({ error: error.message, problems: error.problems });
        }
        request.log.error(error, 'GitHub refused a contribution');
        return reply.code(502).send({
          error:
            'GitHub refused the change. Your edits are still in the overlay; try again later.',
        });
      }
    },
  );
}
