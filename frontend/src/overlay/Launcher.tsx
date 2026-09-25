import { Button, Icon, Tag } from '@blueprintjs/core';
import type { ReactElement } from 'react';
import { languageName } from 'react-cheminfo/translate';

export interface LauncherProps {
  /** The locale being translated into. */
  locale: string;
  /** How many messages are edited. */
  editCount: number;
  /** Whether the message list is showing. */
  isPanelOpen: boolean;
  /** Show or hide the message list. */
  onTogglePanel: () => void;
}

/**
 * The pill that stays in a corner of the page while it is being translated.
 * @param props - The locale, the edit count and the panel toggle.
 * @returns The launcher.
 */
export function Launcher(props: LauncherProps): ReactElement {
  const { locale, editCount, isPanelOpen, onTogglePanel } = props;
  return (
    <div className="translate-launcher" role="toolbar" aria-label="Translate">
      <Icon icon="translate" />
      <span>Translating into {languageName(locale)}</span>
      <Tag minimal round intent={editCount > 0 ? 'success' : 'primary'}>
        {editCount === 1 ? '1 edit' : `${editCount} edits`}
      </Tag>
      <span className="translate-hint">Alt-click any text to edit it</span>
      <Button
        size="small"
        variant="minimal"
        icon={isPanelOpen ? 'chevron-right' : 'list'}
        text={isPanelOpen ? 'Hide messages' : 'Messages'}
        onClick={onTogglePanel}
      />
    </div>
  );
}
