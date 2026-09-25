import { Tag, Tooltip } from '@blueprintjs/core';
import type { ReactElement } from 'react';
import type { MessageSuggestion } from 'react-cheminfo/translate';

export interface SuggestionChipsProps {
  /** What to offer, best first. */
  suggestions: readonly MessageSuggestion[];
  /** Called with the translation the translator took. */
  onTake: (message: string) => void;
}

const EXPLANATION: Record<MessageSuggestion['kind'], string> = {
  exact: 'the same English, translated elsewhere',
  pattern: 'the same English but for the part that is not a word',
  similar: 'English that looks like this one — adapt it',
};

/**
 * The translations already written that this message could take.
 *
 * They are offers, never fills: nothing is written into the box until it is
 * clicked, and each says which message it came from so a translator can see
 * what they are agreeing with.
 * @param props - The suggestions and what to do with one.
 * @returns The row of chips, or nothing when there is nothing to offer.
 */
export function SuggestionChips(
  props: SuggestionChipsProps,
): ReactElement | null {
  const { suggestions, onTake } = props;
  if (suggestions.length === 0) return null;

  return (
    <div className="translate-suggestions">
      <span className="translate-suggestions__caption">Already written:</span>
      {suggestions.map((suggestion) => (
        <Tooltip
          key={`${suggestion.kind}:${suggestion.message}`}
          compact
          hoverOpenDelay={200}
          content={
            <span>
              {suggestion.from.source} — {EXPLANATION[suggestion.kind]} (
              {suggestion.from.key})
            </span>
          }
        >
          <Tag
            interactive
            minimal={suggestion.kind !== 'exact'}
            intent={suggestion.kind === 'similar' ? 'none' : 'primary'}
            onClick={() => {
              onTake(suggestion.message);
            }}
          >
            {suggestion.message}
          </Tag>
        </Tooltip>
      ))}
    </div>
  );
}
