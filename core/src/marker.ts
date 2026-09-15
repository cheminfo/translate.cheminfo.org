/**
 * The invisible mark a message carries while a page is being translated.
 *
 * In translate mode every formatted message is prefixed with its id, written
 * in characters that take no space and join nothing. Whatever the string then
 * becomes — a text node, a `title`, a `placeholder`, a prop handed to a
 * third-party component — the overlay finds it in the DOM and knows which
 * message it is, without any component having been written for it.
 *
 * The digits are the invisible mathematical operators U+2061–U+2064, closed by
 * WORD JOINER U+2060: none of them is whitespace, none joins emoji the way
 * ZERO WIDTH JOINER does, and all are default-ignorable, so fonts draw nothing.
 */

const DIGITS = ['⁡', '⁢', '⁣', '⁤'] as const;
const END = '⁠';
const BASE = DIGITS.length;
const FIRST_DIGIT = 0x20_61;

const MARKER = /[⁡-⁤]+⁠/;
const MARKERS = /[⁡-⁤]+⁠/g;

/**
 * Write a message id as an invisible marker.
 * @param id - The id, a non-negative integer.
 * @returns The marker, to be put in front of the formatted message.
 */
export function encodeMarker(id: number): string {
  if (!Number.isSafeInteger(id) || id < 0) {
    throw new RangeError(`a marker id is a non-negative integer, got ${id}`);
  }
  let digits = '';
  let rest = id;
  do {
    digits = `${DIGITS[rest % BASE]}${digits}`;
    rest = Math.floor(rest / BASE);
  } while (rest > 0);
  return `${digits}${END}`;
}

/**
 * Prefix a formatted message with the marker of its id.
 * @param text - The message as it will be shown.
 * @param id - The id of the message.
 * @returns The same text, with the invisible marker in front.
 */
export function markText(text: string, id: number): string {
  return `${encodeMarker(id)}${text}`;
}

/**
 * The ids of every message a string carries, in the order they appear.
 * @param text - A text node's data or an attribute's value.
 * @returns The ids; empty when the string holds no marker.
 */
export function readMarkers(text: string): number[] {
  const ids: number[] = [];
  for (const match of text.matchAll(MARKERS)) {
    const marker = match[0];
    let id = 0;
    for (let index = 0; index < marker.length - 1; index++) {
      id = id * BASE + (marker.codePointAt(index) ?? FIRST_DIGIT) - FIRST_DIGIT;
    }
    ids.push(id);
  }
  return ids;
}

/**
 * Whether a string carries at least one marker.
 * @param text - The string to look at.
 * @returns True when a marker is present.
 */
export function hasMarker(text: string): boolean {
  return MARKER.test(text);
}

/**
 * The string with every marker removed, as it reads outside translate mode.
 * @param text - A string that may carry markers.
 * @returns The visible text only.
 */
export function stripMarkers(text: string): string {
  return text.replaceAll(MARKERS, '');
}
