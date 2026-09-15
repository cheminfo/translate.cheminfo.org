import {
  Button,
  Callout,
  Dialog,
  DialogBody,
  DialogFooter,
  FormGroup,
  Tag,
  TextArea,
} from '@blueprintjs/core';
import type { ReactElement } from 'react';
import { useMemo, useState } from 'react';
import type { CatalogSnapshot, TranslateBridge } from 'translate-core';
import {
  checkTranslation,
  languageName,
  messageArguments,
  ownMessage,
} from 'translate-core';

export interface MessageEditorProps {
  /** The page's session, which shows the edit as it is typed. */
  bridge: TranslateBridge;
  /** The catalog of the message. */
  catalog: CatalogSnapshot;
  /** The key of the message. */
  messageKey: string;
  onClose: () => void;
}

const PLURAL = /,\s*(?:plural|selectordinal)\s*,/;

/**
 * Edit one message. Every keystroke reaches the page, so the translation is
 * read where it will be shown; an edit that does not pass its check leaves the
 * page on the previous text and says why.
 * @param props - The session, the catalog and the message.
 * @returns The editor.
 */
export function MessageEditor(props: MessageEditorProps): ReactElement {
  const { bridge, catalog, messageKey, onClose } = props;
  const ref = { catalogId: catalog.id, key: messageKey };
  const source = ownMessage(catalog.messages, messageKey) ?? '';
  const published = ownMessage(catalog.translation, messageKey);
  const [value, setValue] = useState(
    () => ownMessage(catalog.drafts, messageKey) ?? published ?? '',
  );

  const placeholders = useMemo(() => {
    try {
      return [...messageArguments(source)];
    } catch {
      return [];
    }
  }, [source]);
  const pluralForms = useMemo(
    () =>
      new Intl.PluralRules(bridge.locale)
        .resolvedOptions()
        .pluralCategories.join(', '),
    [bridge.locale],
  );
  const problems = value === '' ? [] : checkTranslation(source, value);
  const language = languageName(bridge.locale);

  const change = (next: string) => {
    setValue(next);
    const unchanged = next === '' || next === (published ?? '');
    bridge.setDraft(ref, unchanged ? undefined : next);
  };

  return (
    <Dialog
      isOpen
      onClose={onClose}
      title={`${language} — ${messageKey}`}
      icon="translate"
      style={{ width: 'min(640px, 94vw)' }}
    >
      <DialogBody>
        <FormGroup label="English">
          <div className="translate-source">{source}</div>
        </FormGroup>
        {placeholders.length > 0 ? (
          <p className="translate-placeholders">
            Keep exactly these:{' '}
            {placeholders.map((placeholder) => (
              <Tag key={placeholder} minimal translate="no">
                {placeholder}
              </Tag>
            ))}
          </p>
        ) : null}
        {PLURAL.test(source) ? (
          <p className="translate-hint">
            {language} uses the plural forms {pluralForms}; <code>other</code>{' '}
            is always required.
          </p>
        ) : null}
        <FormGroup label={language} labelFor="translate-message">
          <TextArea
            id="translate-message"
            fill
            autoResize
            autoFocus
            value={value}
            onChange={(event) => {
              change(event.currentTarget.value);
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
                onClose();
              }
            }}
          />
        </FormGroup>
        {problems.length > 0 ? (
          <Callout intent="danger" compact>
            <ul className="translate-problems">
              {problems.map((problem) => (
                <li key={`${problem.kind}${problem.argument ?? ''}`}>
                  {problem.message}
                </li>
              ))}
            </ul>
          </Callout>
        ) : null}
        {published === undefined ? null : (
          <p className="translate-hint">
            Published: <span className="translate-published">{published}</span>
          </p>
        )}
      </DialogBody>
      <DialogFooter
        actions={
          <>
            <Button
              variant="minimal"
              text="Start from the English"
              onClick={() => {
                change(source);
              }}
            />
            <Button
              text="Revert"
              disabled={value === (published ?? '')}
              onClick={() => {
                change(published ?? '');
              }}
            />
            <Button intent="primary" text="Done" onClick={onClose} />
          </>
        }
      />
    </Dialog>
  );
}
