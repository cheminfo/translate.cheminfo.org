import type {
  Contribution,
  ContributionProblem,
  ContributionResult,
} from 'react-cheminfo/translate';

/** How a submission ended. */
export type SubmitOutcome =
  | { kind: 'submitted'; result: ContributionResult }
  | { kind: 'rejected'; error: string; problems: ContributionProblem[] }
  | { kind: 'failed'; error: string };

/**
 * Send a contribution to the translation server.
 * @param apiOrigin - Where the server is, e.g. `https://translate.cheminfo.org`.
 * @param contribution - The contribution.
 * @param fetchImpl - The fetch to use.
 * @returns What happened, worded for the translator; never throws.
 */
export async function submitContribution(
  apiOrigin: string,
  contribution: Contribution,
  fetchImpl: typeof globalThis.fetch = globalThis.fetch,
): Promise<SubmitOutcome> {
  let response: Response;
  try {
    response = await fetchImpl(`${apiOrigin}/v1/contributions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(contribution),
    });
  } catch {
    return {
      kind: 'failed',
      error: 'The translation server could not be reached.',
    };
  }

  const body: unknown = await response.json().catch(() => undefined);
  if (response.ok && isResult(body)) return { kind: 'submitted', result: body };
  if (response.status === 422 && isRejection(body)) {
    return { kind: 'rejected', error: body.error, problems: body.problems };
  }
  if (response.status === 429) {
    return {
      kind: 'failed',
      error: 'Too many submissions from this address; try again in an hour.',
    };
  }
  return {
    kind: 'failed',
    error: hasError(body)
      ? body.error
      : `The translation server answered ${response.status}.`,
  };
}

function isResult(body: unknown): body is ContributionResult {
  return (
    typeof body === 'object' &&
    body !== null &&
    'pullRequests' in body &&
    Array.isArray(body.pullRequests)
  );
}

function isRejection(
  body: unknown,
): body is { error: string; problems: ContributionProblem[] } {
  return hasError(body) && 'problems' in body && Array.isArray(body.problems);
}

function hasError(body: unknown): body is { error: string } {
  return (
    typeof body === 'object' &&
    body !== null &&
    'error' in body &&
    typeof body.error === 'string'
  );
}
