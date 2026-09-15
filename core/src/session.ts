import { IntlMessageFormat } from 'intl-messageformat';

import type { CatalogSource, MessageRef, Messages } from './catalog.ts';
import { SOURCE_LOCALE, ownMessage } from './catalog.ts';
import { checkTranslation } from './checkTranslation.ts';
import { markText } from './marker.ts';

/** The values a message's placeholders are filled with. */
export type MessageValues = Record<string, string | number | Date>;

/** The version of the page ↔ overlay protocol this session speaks. */
export const BRIDGE_PROTOCOL = 1;

/** Where a page in translate mode exposes its session to the overlay. */
export const BRIDGE_GLOBAL = '__cheminfoTranslate';

/** A catalog as the overlay sees it: the source, what is published, the edits. */
export interface CatalogSnapshot extends CatalogSource {
  /** The locale file as published with the site. */
  translation: Messages;
  /** The messages edited in the overlay and not yet submitted. */
  drafts: Messages;
}

/**
 * What a page in translate mode offers the overlay. It is the only contract
 * between the two, so an overlay released later still drives a page built
 * earlier as long as the protocol number matches.
 */
export interface TranslateBridge {
  /** The protocol version; the overlay refuses a page speaking another. */
  readonly protocol: typeof BRIDGE_PROTOCOL;
  /** The locale being translated into. */
  readonly locale: string;
  /** Every catalog the page registered. */
  catalogs: () => CatalogSnapshot[];
  /** The message a marker found in the DOM stands for. */
  resolveMarker: (id: number) => MessageRef | undefined;
  /** Show an edited message on the page; `undefined` removes the edit. */
  setDraft: (ref: MessageRef, message: string | undefined) => void;
  /** Be told whenever a draft changes; returns the function that stops it. */
  subscribe: (listener: () => void) => () => void;
}

/** How a session is set up. */
export interface TranslateSessionOptions {
  /** The locale messages are shown in. */
  locale: string;
  /** Every catalog the page renders from. */
  catalogs: readonly CatalogSource[];
  /**
   * The published messages of `locale`, by catalog id.
   * @default {}
   */
  translations?: Readonly<Record<string, Messages>>;
  /**
   * Whether every formatted message carries its invisible marker, which is
   * what translate mode is.
   * @default false
   */
  marked?: boolean;
}

interface CatalogState {
  source: CatalogSource;
  translation: Messages;
  drafts: Map<string, string>;
}

/**
 * Formats the messages of a page, and in translate mode lets the overlay edit
 * them live: a draft replaces the published message as soon as it can be
 * formatted, and a draft that cannot is ignored rather than breaking the page.
 */
export class TranslateSession implements TranslateBridge {
  public readonly protocol = BRIDGE_PROTOCOL;
  public readonly locale: string;
  readonly #marked: boolean;
  readonly #catalogs = new Map<string, CatalogState>();
  readonly #ids = new Map<string, number>();
  readonly #refs: MessageRef[] = [];
  readonly #listeners = new Set<() => void>();
  readonly #formatters = new Map<string, IntlMessageFormat | null>();
  readonly #checked = new Map<string, boolean>();
  #version = 0;

  public constructor(options: TranslateSessionOptions) {
    const { locale, catalogs, translations = {}, marked = false } = options;
    this.locale = locale;
    this.#marked = marked;
    for (const source of catalogs) {
      this.#catalogs.set(source.id, {
        source,
        translation: translations[source.id] ?? {},
        drafts: new Map(),
      });
    }
  }

  /** Increases on every draft change, for a view that re-renders on it. */
  public get version(): number {
    return this.#version;
  }

  /**
   * Format one message: the draft, else the published translation, else the
   * English message — the first that passes its check against the English
   * one and formats. A draft that drops a placeholder formats without error,
   * so the check, not the formatting, is what keeps it off the page.
   * @param catalogId - The catalog the message belongs to.
   * @param key - The key of the message.
   * @param values - What the placeholders are filled with.
   * @returns The text to show; the key itself when no catalog has it.
   */
  public format(catalogId: string, key: string, values?: MessageValues) {
    const catalog = this.#catalogs.get(catalogId);
    if (catalog === undefined) return key;
    const source = ownMessage(catalog.source.messages, key);
    if (source === undefined) return key;

    const draft = this.#usable(source, catalog.drafts.get(key));
    const translation = this.#usable(
      source,
      ownMessage(catalog.translation, key),
    );
    const text =
      this.#tryFormat(draft, this.locale, values) ??
      this.#tryFormat(translation, this.locale, values) ??
      this.#tryFormat(source, SOURCE_LOCALE, values) ??
      source;
    return this.#marked ? markText(text, this.#idOf(catalogId, key)) : text;
  }

  public catalogs(): CatalogSnapshot[] {
    const snapshots: CatalogSnapshot[] = [];
    for (const { source, translation, drafts } of this.#catalogs.values()) {
      snapshots.push({
        ...source,
        translation,
        drafts: Object.fromEntries(drafts),
      });
    }
    return snapshots;
  }

  public resolveMarker(id: number): MessageRef | undefined {
    return this.#refs[id];
  }

  public setDraft(ref: MessageRef, message: string | undefined): void {
    const catalog = this.#catalogs.get(ref.catalogId);
    if (catalog === undefined) return;
    if (ownMessage(catalog.source.messages, ref.key) === undefined) return;
    if (catalog.drafts.get(ref.key) === message) return;
    if (message === undefined) {
      catalog.drafts.delete(ref.key);
    } else {
      catalog.drafts.set(ref.key, message);
    }
    this.#version++;
    for (const listener of this.#listeners) listener();
  }

  public subscribe(listener: () => void): () => void {
    this.#listeners.add(listener);
    return () => {
      this.#listeners.delete(listener);
    };
  }

  #idOf(catalogId: string, key: string): number {
    const name = `${catalogId}\n${key}`;
    let id = this.#ids.get(name);
    if (id === undefined) {
      id = this.#refs.length;
      this.#refs.push({ catalogId, key });
      this.#ids.set(name, id);
    }
    return id;
  }

  #usable(source: string, message: string | undefined): string | undefined {
    if (message === undefined) return undefined;
    const name = JSON.stringify([source, message]);
    let usable = this.#checked.get(name);
    if (usable === undefined) {
      usable = checkTranslation(source, message).length === 0;
      this.#checked.set(name, usable);
    }
    return usable ? message : undefined;
  }

  #tryFormat(
    message: string | undefined,
    locale: string,
    values: MessageValues | undefined,
  ): string | undefined {
    if (message === undefined) return undefined;
    const name = `${locale}\n${message}`;
    let formatter = this.#formatters.get(name);
    if (formatter === undefined) {
      try {
        formatter = new IntlMessageFormat(message, locale);
      } catch {
        formatter = null;
      }
      this.#formatters.set(name, formatter);
    }
    if (formatter === null) return undefined;
    try {
      const output = formatter.format(values);
      return Array.isArray(output) ? output.join('') : String(output);
    } catch {
      return undefined;
    }
  }
}
