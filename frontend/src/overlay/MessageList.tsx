import type { Intent } from '@blueprintjs/core';
import { Tag } from '@blueprintjs/core';
import type { ReactElement } from 'react';
import type { CatalogSnapshot, MessageRef } from 'translate-core';
import { ownMessage } from 'translate-core';

import type { MessageStatus } from './messageStatus.ts';
import { messageStatus } from './messageStatus.ts';
import { refName } from './scanPage.ts';

/** Which messages the list shows. */
export type MessageFilter = 'page' | 'missing' | 'edited' | 'all';

/** What decides which rows are listed. */
export interface MessageSelection {
  catalogs: readonly CatalogSnapshot[];
  filter: MessageFilter;
  search: string;
  /** The messages the page shows right now, as `catalogId:key`. */
  onPage: ReadonlySet<string>;
  /** When set, only these messages are listed, whatever the filter. */
  picked: MessageRef[] | undefined;
}

export interface MessageListProps extends MessageSelection {
  onEdit: (ref: MessageRef) => void;
}

/** More rows than this make the panel slow to scroll and useless to read. */
const MAX_ROWS = 300;

const STATUS_TAG: Record<MessageStatus, { label: string; intent: Intent }> = {
  missing: { label: 'Missing', intent: 'warning' },
  draft: { label: 'Edited', intent: 'success' },
  invalid: { label: 'Invalid', intent: 'danger' },
  translated: { label: 'Translated', intent: 'primary' },
};

/**
 * The messages, each with its English text, what it reads now, and its status.
 * @param props - The catalogs, the filter and the search.
 * @returns The list.
 */
export function MessageList(props: MessageListProps): ReactElement {
  const { catalogs, filter, search, onPage, picked, onEdit } = props;
  const rows = listRows({ catalogs, filter, search, onPage, picked });
  if (rows.length === 0) {
    return <p className="translate-empty">No message matches.</p>;
  }
  return (
    <div className="translate-rows">
      {rows.slice(0, MAX_ROWS).map((row) => (
        <button
          key={refName(row.ref)}
          type="button"
          className="translate-row"
          onClick={() => {
            onEdit(row.ref);
          }}
        >
          <span className="translate-row-head">
            <code translate="no">{row.ref.key}</code>
            <Tag minimal intent={STATUS_TAG[row.status].intent}>
              {STATUS_TAG[row.status].label}
            </Tag>
          </span>
          <span className="translate-row-source">{row.source}</span>
          {row.current === undefined ? null : (
            <span className="translate-row-text">{row.current}</span>
          )}
        </button>
      ))}
      {rows.length > MAX_ROWS ? (
        <p className="translate-empty">
          {rows.length - MAX_ROWS} more; refine the search to see them.
        </p>
      ) : null}
    </div>
  );
}

interface Row {
  ref: MessageRef;
  source: string;
  current: string | undefined;
  status: MessageStatus;
}

function listRows(selection: MessageSelection): Row[] {
  const { catalogs, filter, onPage, picked } = selection;
  const search = selection.search.trim().toLowerCase();
  const wanted =
    picked === undefined
      ? undefined
      : new Set(picked.map((ref) => refName(ref)));
  const rows: Row[] = [];

  for (const catalog of catalogs) {
    for (const [key, source] of Object.entries(catalog.messages)) {
      const ref = { catalogId: catalog.id, key };
      const name = refName(ref);
      if (wanted !== undefined && !wanted.has(name)) continue;
      const status = messageStatus(catalog, key);
      if (
        wanted === undefined &&
        !matchesFilter(filter, status, onPage.has(name))
      ) {
        continue;
      }
      const current =
        ownMessage(catalog.drafts, key) ?? ownMessage(catalog.translation, key);
      if (
        search !== '' &&
        !`${key}\n${source}\n${current ?? ''}`.toLowerCase().includes(search)
      ) {
        continue;
      }
      rows.push({ ref, source, current, status });
    }
  }
  return rows;
}

function matchesFilter(
  filter: MessageFilter,
  status: MessageStatus,
  isOnPage: boolean,
): boolean {
  switch (filter) {
    case 'page':
      return isOnPage;
    case 'missing':
      return status === 'missing';
    case 'edited':
      return status === 'draft' || status === 'invalid';
    case 'all':
      return true;
    // no default
  }
}
