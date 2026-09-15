/**
 * The reverse proxies whose `X-Forwarded-For` is believed, as Fastify takes it.
 *
 * A hop count is deliberately not accepted: Fastify fails closed on one — it
 * cannot validate the immediate peer, so it trusts nothing — and a deployment
 * that asked for two hops would silently read every address as the proxy's.
 * @param value - What `TRUST_PROXY` reads: `true`, an address, a CIDR range,
 * or a comma separated list of either.
 * @returns The value Fastify's `trustProxy` option takes; `false` when nothing
 * proxies this service.
 */
export function parseTrustProxy(value?: string): boolean | string {
  const setting = value?.trim();
  if (!setting || setting === 'false') return false;
  if (setting === 'true') return true;
  return setting;
}
