import { readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

import fastifyStatic from '@fastify/static';
import type { FastifyReply } from 'fastify';

import type { FastifyTyped } from '../types.ts';

/** Nothing here is meant to be found: it is an admin site. */
const NO_INDEX = 'noindex, nofollow';

/** How long a site may reuse `overlay.js` before asking for it again, in s. */
const OVERLAY_MAX_AGE = 300;

/**
 * Serve the built admin page, and `overlay.js` to the sites that load it.
 *
 * Every page answers `noindex` and `robots.txt` disallows everything: no site
 * of the family links here, and nothing should lead a visitor here either.
 * @param fastify - The Fastify instance.
 * @param root - The directory holding the build.
 */
export function registerFrontend(fastify: FastifyTyped, root: string): void {
  const index = readFileSync(join(root, 'index.html'), 'utf8');

  const sendIndex = (reply: FastifyReply) =>
    reply
      .header('x-robots-tag', NO_INDEX)
      .type('text/html; charset=utf-8')
      .send(index);

  void fastify.register(fastifyStatic, {
    root,
    index: false,
    setHeaders(reply, path) {
      reply.header('x-robots-tag', NO_INDEX);
      const served = relative(root, path);
      if (served === 'overlay.js' || served.startsWith(`overlay${sep}`)) {
        // Loaded by pages of other origins, chunks included; the entry's name
        // carries no hash, so a release reaches the sites within minutes.
        reply.header('cache-control', `public, max-age=${OVERLAY_MAX_AGE}`);
        reply.header('cross-origin-resource-policy', 'cross-origin');
      }
    },
  });

  fastify.get('/', { schema: { hide: true } }, (_request, reply) =>
    sendIndex(reply),
  );

  fastify.get('/robots.txt', { schema: { hide: true } }, (_request, reply) =>
    reply
      .type('text/plain; charset=utf-8')
      .send('User-agent: *\nDisallow: /\n'),
  );

  fastify.setNotFoundHandler((request, reply) => {
    if (request.method !== 'GET' || request.url.startsWith('/v1/')) {
      return reply.code(404).send({ error: 'Not found' });
    }
    return sendIndex(reply);
  });
}
