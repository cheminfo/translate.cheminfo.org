import {
  Alert,
  Button,
  Callout,
  Drawer,
  InputGroup,
  ProgressBar,
  SegmentedControl,
} from '@blueprintjs/core';
import type { ReactElement } from 'react';
import { useState } from 'react';
import type { CatalogSnapshot, MessageRef } from 'translate-core';
import { languageName } from 'translate-core';

import type { MessageFilter } from './MessageList.tsx';
import { MessageList } from './MessageList.tsx';
import { catalogProgress } from './messageStatus.ts';

export interface MessagePanelProps {
  isOpen: boolean;
  onClose: () => void;
  /** The locale being translated into. */
  locale: string;
  /** Every catalog of the page. */
  catalogs: readonly CatalogSnapshot[];
  /** The messages the page shows right now, as `catalogId:key`. */
  onPage: ReadonlySet<string>;
  /** The messages of the element last Alt-clicked, when it showed several. */
  picked: MessageRef[] | undefined;
  onClearPicked: () => void;
  /** How many elements hold text no message produced. */
  hardcodedCount: number;
  /** Edits that can be sent, and edits that cannot yet. */
  counts: { valid: number; invalid: number };
  onEdit: (ref: MessageRef) => void;
  onSubmit: () => void;
  onDownload: () => void;
  onClearEdits: () => void;
}

const FILTERS: Array<{ label: string; value: MessageFilter }> = [
  { label: 'On this page', value: 'page' },
  { label: 'Missing', value: 'missing' },
  { label: 'Edited', value: 'edited' },
  { label: 'All', value: 'all' },
];

/**
 * The side panel: progress, the list of messages, and what to do with the
 * edits. It lists what cannot be Alt-clicked too — a tooltip not open, an
 * error not shown, a message of another page.
 * @param props - The catalogs, what is on the page, and the actions.
 * @returns The panel.
 */
export function MessagePanel(props: MessagePanelProps): ReactElement {
  const {
    isOpen,
    onClose,
    locale,
    catalogs,
    onPage,
    picked,
    onClearPicked,
    hardcodedCount,
    counts,
    onEdit,
    onSubmit,
    onDownload,
    onClearEdits,
  } = props;
  const [filter, setFilter] = useState<MessageFilter>('page');
  const [search, setSearch] = useState('');
  const [isConfirmingClear, setIsConfirmingClear] = useState(false);
  const language = languageName(locale);

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={`Translating into ${language}`}
      icon="translate"
      position="right"
      size="440px"
      hasBackdrop={false}
      canOutsideClickClose={false}
      enforceFocus={false}
      autoFocus={false}
    >
      <div className="translate-panel">
        <section className="translate-panel-section">
          {catalogs.map((catalog) => {
            const progress = catalogProgress(catalog);
            return (
              <div key={catalog.id}>
                <div className="translate-progress-label">
                  <span translate="no">{catalog.id}</span>
                  <span>
                    {progress.translated} of {progress.total} translated
                  </span>
                </div>
                <ProgressBar
                  value={
                    progress.total === 0
                      ? 1
                      : progress.translated / progress.total
                  }
                  intent="success"
                  animate={false}
                  stripes={false}
                />
              </div>
            );
          })}
          {hardcodedCount > 0 ? (
            <Callout intent="warning" icon="high-priority" compact>
              {hardcodedCount === 1
                ? '1 text on this page is not translatable yet; it is outlined with dots.'
                : `${hardcodedCount} texts on this page are not translatable yet; they are outlined with dots.`}
            </Callout>
          ) : null}
        </section>

        <section className="translate-panel-section">
          {picked === undefined ? (
            <>
              <SegmentedControl
                fill
                size="small"
                options={FILTERS}
                value={filter}
                onValueChange={(value) => {
                  setFilter(value as MessageFilter);
                }}
              />
              <InputGroup
                leftIcon="search"
                placeholder="Search keys and text"
                value={search}
                onValueChange={setSearch}
                spellCheck={false}
              />
            </>
          ) : (
            <Callout
              intent="primary"
              compact
              title={`${picked.length} messages under what you clicked`}
            >
              <Button
                size="small"
                text="Show every message"
                onClick={onClearPicked}
              />
            </Callout>
          )}
        </section>

        <div className="translate-panel-list">
          <MessageList
            catalogs={catalogs}
            filter={filter}
            search={search}
            onPage={onPage}
            picked={picked}
            onEdit={onEdit}
          />
        </div>

        <section className="translate-panel-actions">
          {counts.invalid > 0 ? (
            <Callout intent="danger" compact>
              {counts.invalid === 1
                ? '1 edit does not pass its check and will not be sent.'
                : `${counts.invalid} edits do not pass their check and will not be sent.`}
            </Callout>
          ) : null}
          <div className="translate-panel-buttons">
            <Button
              intent="primary"
              icon="git-pull"
              text={`Submit ${counts.valid}`}
              disabled={counts.valid === 0}
              onClick={onSubmit}
            />
            <Button
              icon="download"
              text="Download JSON"
              disabled={counts.valid === 0}
              onClick={onDownload}
            />
            <Button
              variant="minimal"
              intent="danger"
              text="Clear edits"
              disabled={counts.valid + counts.invalid === 0}
              onClick={() => {
                setIsConfirmingClear(true);
              }}
            />
          </div>
        </section>
      </div>

      <Alert
        isOpen={isConfirmingClear}
        intent="danger"
        icon="trash"
        confirmButtonText="Clear every edit"
        cancelButtonText="Keep them"
        onConfirm={() => {
          setIsConfirmingClear(false);
          onClearEdits();
        }}
        onCancel={() => {
          setIsConfirmingClear(false);
        }}
      >
        Every edit made on this site for {language} is removed from this
        browser. Pull requests already opened are not touched.
      </Alert>
    </Drawer>
  );
}
