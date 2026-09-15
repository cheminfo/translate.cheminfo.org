/**
 * The token that lets a translator add to the pull request they opened.
 *
 * It names the pull request in the clear and carries an HMAC of that name, so
 * the server needs no storage to know the token is one it issued.
 */

/** A pull request a continuation token points at. */
export interface Continuation {
  /** The repository, `owner/repo`. */
  repository: string;
  /** The pull request number. */
  number: number;
}

const encoder = new TextEncoder();
const TOKEN =
  /^(?<repository>[^#\s]+\/[^#\s]+)#(?<number>[1-9]\d{0,9})\.(?<signature>[\da-f]{64})$/;

/**
 * Issue the token for a pull request.
 * @param secret - The server's contribution secret.
 * @param continuation - The pull request.
 * @returns The token.
 */
export async function signContinuation(
  secret: string,
  continuation: Continuation,
): Promise<string> {
  const payload = `${continuation.repository}#${continuation.number}`;
  const key = await importKey(secret);
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(payload),
  );
  return `${payload}.${toHex(new Uint8Array(signature))}`;
}

/**
 * Read a token, if the server issued it.
 * @param secret - The server's contribution secret.
 * @param token - The token the overlay sent back.
 * @returns The pull request, or `undefined` for a token this server did not sign.
 */
export async function readContinuation(
  secret: string,
  token: string,
): Promise<Continuation | undefined> {
  const groups = TOKEN.exec(token)?.groups;
  if (
    groups?.repository === undefined ||
    groups.number === undefined ||
    groups.signature === undefined
  ) {
    return undefined;
  }
  const payload = `${groups.repository}#${groups.number}`;
  const key = await importKey(secret);
  const valid = await crypto.subtle.verify(
    'HMAC',
    key,
    fromHex(groups.signature),
    encoder.encode(payload),
  );
  if (!valid) return undefined;
  return { repository: groups.repository, number: Number(groups.number) };
}

function importKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
}

function toHex(bytes: Uint8Array): string {
  let hex = '';
  for (const byte of bytes) {
    hex += byte.toString(16).padStart(2, '0');
  }
  return hex;
}

function fromHex(hex: string): Uint8Array<ArrayBuffer> {
  const bytes = new Uint8Array(hex.length / 2);
  for (let index = 0; index < bytes.length; index++) {
    bytes[index] = Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16);
  }
  return bytes;
}
