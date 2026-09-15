/**
 * What the overlay sends the server, and what the server answers.
 */

import type { Messages } from './catalog.ts';

/** The longest message a contribution may carry, in characters. */
export const MAX_MESSAGE_LENGTH = 5000;

/** The most messages one catalog of a contribution may carry. */
export const MAX_MESSAGES_PER_CATALOG = 2000;

/** The most catalogs one contribution may carry. */
export const MAX_CATALOGS = 32;

/** The longest name a translator may be credited under. */
export const MAX_CONTRIBUTOR_LENGTH = 100;

/** The longest note a translator may leave for the reviewer. */
export const MAX_NOTE_LENGTH = 1000;

/** The messages translated for one catalog. */
export interface ContributionCatalog {
  /** The repository the catalog lives in, written `owner/repo`. */
  repository: string;
  /** The catalog directory, relative to the repository root. */
  directory: string;
  /** The translated messages by key. */
  messages: Messages;
}

/** One submission from the overlay. */
export interface Contribution {
  /** The locale the messages are written in. */
  locale: string;
  /** The translated messages, catalog by catalog. */
  catalogs: ContributionCatalog[];
  /**
   * The name the pull request credits.
   * @default undefined
   */
  contributor?: string;
  /**
   * A note for whoever reviews the pull request.
   * @default undefined
   */
  note?: string;
  /**
   * Continuation tokens of pull requests this translator opened before: a
   * repository that has an open one gets a new commit there, not a new PR.
   * @default []
   */
  continuations?: string[];
}

/** A pull request a contribution opened or added to. */
export interface ContributionPullRequest {
  /** The repository the pull request is on, `owner/repo`. */
  repository: string;
  /** Its number. */
  number: number;
  /** Where to read it. */
  url: string;
  /** How many messages this contribution changed in it. */
  messageCount: number;
  /** Whether an existing pull request was added to rather than opened. */
  updated: boolean;
  /** The token that lets the same translator add to it next time. */
  continuation: string;
}

/** What a successful submission answers. */
export interface ContributionResult {
  /** One entry per repository that changed; empty when nothing did. */
  pullRequests: ContributionPullRequest[];
}

/** One reason a submission was refused. */
export interface ContributionProblem {
  /** The repository concerned. */
  repository: string;
  /** The catalog directory concerned. */
  directory: string;
  /**
   * The message concerned, when the problem is about one.
   * @default undefined
   */
  key?: string;
  /** The sentence the translator reads. */
  message: string;
}

/** What a refused submission answers. */
export interface ContributionRejection {
  /** A summary of why. */
  error: string;
  /** Every problem found. */
  problems: ContributionProblem[];
}
