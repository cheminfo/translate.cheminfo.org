import type { MessageFormatElement } from '@formatjs/icu-messageformat-parser';
import { TYPE, parse } from '@formatjs/icu-messageformat-parser';

/** What can be wrong with one translated message. */
export type MessageProblemKind =
  | 'empty'
  | 'syntax'
  | 'source-syntax'
  | 'missing-argument'
  | 'unknown-argument';

/** One thing wrong with a translated message, worded for the translator. */
export interface MessageProblem {
  /** What kind of problem it is. */
  kind: MessageProblemKind;
  /** The sentence the translator reads. */
  message: string;
  /**
   * The placeholder or tag the problem is about, written as it appears in a
   * message: `{count}` or `<link>`.
   * @default undefined
   */
  argument?: string;
}

/**
 * Check a translation against the English message it translates: it must be
 * a valid ICU message and use exactly the placeholders and tags of the source.
 * @param source - The English message.
 * @param translation - The translated message.
 * @returns Every problem found; empty when the translation can be used.
 */
export function checkTranslation(
  source: string,
  translation: string,
): MessageProblem[] {
  if (translation.trim() === '') {
    return [{ kind: 'empty', message: 'The translation is empty.' }];
  }

  let expected: Set<string>;
  try {
    expected = messageArguments(source);
  } catch (error) {
    return [
      {
        kind: 'source-syntax',
        message: `The English message itself is not valid: ${describe(error)}`,
      },
    ];
  }

  let actual: Set<string>;
  try {
    actual = messageArguments(translation);
  } catch (error) {
    return [{ kind: 'syntax', message: describe(error) }];
  }

  const problems: MessageProblem[] = [];
  for (const argument of expected) {
    if (!actual.has(argument)) {
      problems.push({
        kind: 'missing-argument',
        argument,
        message: `${argument} is in the English message but not in the translation.`,
      });
    }
  }
  for (const argument of actual) {
    if (!expected.has(argument)) {
      problems.push({
        kind: 'unknown-argument',
        argument,
        message: `${argument} is not in the English message, so nothing would fill it.`,
      });
    }
  }
  return problems;
}

/**
 * The placeholders and tags a message uses, each written as it appears in the
 * message: `{count}` for an argument, `<link>` for a tag.
 * @param message - An ICU message.
 * @returns The set of placeholders and tags.
 * @throws {SyntaxError} When the message does not parse.
 */
export function messageArguments(message: string): Set<string> {
  const found = new Set<string>();
  collect(parse(message), found);
  return found;
}

function collect(elements: MessageFormatElement[], found: Set<string>): void {
  for (const element of elements) {
    switch (element.type) {
      case TYPE.argument:
      case TYPE.number:
      case TYPE.date:
      case TYPE.time:
        found.add(`{${element.value}}`);
        break;
      case TYPE.select:
      case TYPE.plural:
        found.add(`{${element.value}}`);
        for (const option of Object.values(element.options)) {
          collect(option.value, found);
        }
        break;
      case TYPE.tag:
        found.add(`<${element.value}>`);
        collect(element.children, found);
        break;
      case TYPE.literal:
      case TYPE.pound:
        break;
      // no default
    }
  }
}

function describe(error: unknown): string {
  if (error instanceof Error) {
    return `The message does not parse (${error.message}).`;
  }
  return 'The message does not parse.';
}
