import type { Messages } from './catalog.ts';
import { ownMessage } from './catalog.ts';

/**
 * Merge a translator's messages into a locale file.
 *
 * Keys come out in the order of the English file, so a pull request's diff is
 * the lines that changed and nothing else; keys the English file no longer has
 * are kept, last, because removing them is not the translator's decision.
 * @param source - The English messages, whose order is followed.
 * @param existing - The locale file as it is in the repository.
 * @param updates - The messages the translator wrote.
 * @returns The merged messages.
 */
export function mergeMessages(
  source: Messages,
  existing: Messages,
  updates: Messages,
): Messages {
  const entries: Array<[string, string]> = [];
  for (const key of Object.keys(source)) {
    const message = ownMessage(updates, key) ?? ownMessage(existing, key);
    if (message !== undefined) entries.push([key, message]);
  }
  for (const [key, message] of Object.entries(existing)) {
    if (!Object.hasOwn(source, key)) entries.push([key, message]);
  }
  return Object.fromEntries(entries);
}

/**
 * The keys whose message an update actually changes.
 * @param existing - The locale file as it is in the repository.
 * @param updates - The messages the translator wrote.
 * @returns The keys that differ, in the order of the updates.
 */
export function changedKeys(existing: Messages, updates: Messages): string[] {
  const keys: string[] = [];
  for (const [key, message] of Object.entries(updates)) {
    if (ownMessage(existing, key) !== message) keys.push(key);
  }
  return keys;
}

/**
 * Write messages the way a catalog file is committed: two-space JSON with a
 * final newline, which is also what Prettier leaves untouched.
 * @param messages - The messages.
 * @returns The file content.
 */
export function serializeMessages(messages: Messages): string {
  return `${JSON.stringify(messages, null, 2)}\n`;
}

/**
 * Read a catalog file, refusing anything but a flat object of strings.
 * @param text - The file content.
 * @returns The messages.
 * @throws {TypeError} When the content is not a flat object of strings.
 */
export function parseMessages(text: string): Messages {
  const parsed: unknown = JSON.parse(text);
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new TypeError('a catalog file must hold one JSON object');
  }
  const entries: Array<[string, string]> = [];
  for (const [key, value] of Object.entries(parsed)) {
    if (typeof value !== 'string') {
      throw new TypeError(`the message "${key}" is not a string`);
    }
    entries.push([key, value]);
  }
  return Object.fromEntries(entries);
}
