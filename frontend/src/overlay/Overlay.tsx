import type { ReactElement } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { downloadText } from 'react-cheminfo/core';
import type { MessageRef, TranslateBridge } from 'react-cheminfo/translate';

import { Launcher } from './Launcher.tsx';
import { MessageEditor } from './MessageEditor.tsx';
import { MessagePanel } from './MessagePanel.tsx';
import { SubmitDialog } from './SubmitDialog.tsx';
import { TableEditor } from './TableEditor.tsx';
import { messageStatus } from './messageStatus.ts';
import { storeDrafts } from './overlayStore.ts';
import {
  pendingChanges,
  pendingCounts,
  translationFiles,
} from './pendingChanges.ts';
import { refName } from './scanPage.ts';
import { translatedPairs } from './tableRows.ts';
import { useAltClick, useAnnotations, usePageScan } from './usePageScan.ts';

export interface OverlayProps {
  /** The page's session. */
  bridge: TranslateBridge;
  /** Where the translation server is. */
  apiOrigin: string;
  /** The overlay's host element on the page. */
  host: Element;
}

/**
 * The translate overlay: the launcher, the list of messages, the editor of
 * one message, and the submission.
 * @param props - The page, the server and the host element.
 * @returns The overlay.
 */
export function Overlay(props: OverlayProps): ReactElement {
  const { bridge, apiOrigin, host } = props;
  const [catalogs, setCatalogs] = useState(() => bridge.catalogs());
  const [isPanelOpen, setIsPanelOpen] = useState(true);
  const [editing, setEditing] = useState<MessageRef>();
  const [picked, setPicked] = useState<MessageRef[]>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditingTables, setIsEditingTables] = useState(false);
  const tables = useMemo(() => bridge.tables(), [bridge]);

  useEffect(
    () =>
      bridge.subscribe(() => {
        setCatalogs(bridge.catalogs());
      }),
    [bridge],
  );

  useEffect(() => {
    storeDrafts(bridge.locale, catalogs);
  }, [bridge.locale, catalogs]);

  const byId = useMemo(() => {
    const map = new Map<string, (typeof catalogs)[number]>();
    for (const catalog of catalogs) map.set(catalog.id, catalog);
    return map;
  }, [catalogs]);

  const statusOf = useCallback(
    (ref: MessageRef) => {
      const catalog = byId.get(ref.catalogId);
      return catalog === undefined
        ? 'missing'
        : messageStatus(catalog, ref.key);
    },
    [byId],
  );

  const scan = usePageScan(bridge, host);
  useAnnotations(scan, statusOf);
  useAltClick(scan.elements, (refs) => {
    if (refs.length === 1) {
      setEditing(refs[0]);
    } else {
      setPicked(refs);
      setIsPanelOpen(true);
    }
  });

  const pending = useMemo(() => pendingChanges(catalogs), [catalogs]);
  const pairs = useMemo(() => translatedPairs(catalogs), [catalogs]);
  const counts = pendingCounts(pending);
  const editingCatalog =
    editing === undefined ? undefined : byId.get(editing.catalogId);

  return (
    <>
      <Launcher
        locale={bridge.locale}
        editCount={counts.valid + counts.invalid}
        isPanelOpen={isPanelOpen}
        onTogglePanel={() => {
          setIsPanelOpen((open) => !open);
        }}
      />
      <MessagePanel
        isOpen={isPanelOpen}
        onClose={() => {
          setIsPanelOpen(false);
        }}
        locale={bridge.locale}
        catalogs={catalogs}
        onPage={scan.names}
        picked={picked}
        onClearPicked={() => {
          setPicked(undefined);
        }}
        hardcodedCount={scan.hardcoded.length}
        tableCount={tables.length}
        onEditTables={() => {
          setIsEditingTables(true);
        }}
        counts={counts}
        onEdit={setEditing}
        onSubmit={() => {
          setIsSubmitting(true);
        }}
        onDownload={() => {
          for (const file of translationFiles(bridge.locale, pending)) {
            downloadText(file.content, file.fileName, 'application/json');
          }
        }}
        onClearEdits={() => {
          for (const catalog of catalogs) {
            for (const key of Object.keys(catalog.drafts)) {
              bridge.setDraft({ catalogId: catalog.id, key }, undefined);
            }
          }
        }}
      />
      {editing !== undefined && editingCatalog !== undefined ? (
        <MessageEditor
          key={refName(editing)}
          bridge={bridge}
          catalog={editingCatalog}
          messageKey={editing.key}
          pairs={pairs}
          onClose={() => {
            setEditing(undefined);
          }}
        />
      ) : null}
      {isEditingTables ? (
        <TableEditor
          bridge={bridge}
          tables={tables}
          catalogs={catalogs}
          onClose={() => {
            setIsEditingTables(false);
          }}
        />
      ) : null}
      <SubmitDialog
        isOpen={isSubmitting}
        onClose={() => {
          setIsSubmitting(false);
        }}
        locale={bridge.locale}
        pending={pending}
        apiOrigin={apiOrigin}
      />
    </>
  );
}
