import {
  Button,
  Callout,
  Dialog,
  DialogBody,
  DialogFooter,
  FormGroup,
  InputGroup,
  TextArea,
} from '@blueprintjs/core';
import type { ReactElement } from 'react';
import { useState } from 'react';
import {
  MAX_CONTRIBUTOR_LENGTH,
  MAX_NOTE_LENGTH,
} from 'react-cheminfo/translate';

import { mergeContinuations, readStored, writeStored } from './overlayStore.ts';
import type { PendingCatalog } from './pendingChanges.ts';
import { buildContribution, pendingCounts } from './pendingChanges.ts';
import type { SubmitOutcome } from './submitContribution.ts';
import { submitContribution } from './submitContribution.ts';

export interface SubmitDialogProps {
  isOpen: boolean;
  onClose: () => void;
  /** The locale translated into. */
  locale: string;
  /** The edits. */
  pending: readonly PendingCatalog[];
  /** Where the translation server is. */
  apiOrigin: string;
}

type Status = { kind: 'idle' } | { kind: 'sending' } | SubmitOutcome;

/**
 * Send the edits: who is sending, a note for the reviewer, and the pull
 * requests that come back. The edits stay in the overlay afterwards, so the
 * page keeps showing them; sending them again changes nothing that is
 * already proposed.
 * @param props - The edits and the server.
 * @returns The dialog.
 */
export function SubmitDialog(props: SubmitDialogProps): ReactElement {
  const { isOpen, onClose, locale, pending, apiOrigin } = props;
  const [contributor, setContributor] = useState(
    () => readStored().contributor,
  );
  const [note, setNote] = useState('');
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const counts = pendingCounts(pending);

  const submit = async () => {
    setStatus({ kind: 'sending' });
    const stored = readStored();
    const outcome = await submitContribution(
      apiOrigin,
      buildContribution(locale, pending, {
        contributor,
        note,
        continuations: stored.continuations,
      }),
    );
    if (outcome.kind === 'submitted') {
      writeStored({
        ...readStored(),
        contributor,
        continuations: mergeContinuations(stored.continuations, outcome.result),
      });
    }
    setStatus(outcome);
  };

  const close = () => {
    setStatus({ kind: 'idle' });
    onClose();
  };
  const back = (
    <Button
      text="Back"
      onClick={() => {
        setStatus({ kind: 'idle' });
      }}
    />
  );

  return (
    <Dialog
      isOpen={isOpen}
      onClose={close}
      title="Propose the translation"
      icon="git-pull"
    >
      <DialogBody>
        {status.kind === 'idle' || status.kind === 'sending' ? (
          <>
            <Callout intent="primary" compact>
              {counts.valid === 1 ? '1 message' : `${counts.valid} messages`}{' '}
              will be proposed as a pull request on each repository they belong
              to. A maintainer reviews and merges it.
            </Callout>
            <FormGroup
              label="Your name"
              labelInfo="(optional, shown in the pull request)"
            >
              <InputGroup
                value={contributor}
                onValueChange={setContributor}
                maxLength={MAX_CONTRIBUTOR_LENGTH}
              />
            </FormGroup>
            <FormGroup label="A note for the reviewer" labelInfo="(optional)">
              <TextArea
                fill
                value={note}
                maxLength={MAX_NOTE_LENGTH}
                onChange={(event) => {
                  setNote(event.currentTarget.value);
                }}
              />
            </FormGroup>
          </>
        ) : null}
        {status.kind === 'submitted' ? <Submitted outcome={status} /> : null}
        {status.kind === 'rejected' ? (
          <Callout intent="danger" title={status.error}>
            <ul className="translate-problems">
              {status.problems.map((problem) => (
                <li
                  key={`${problem.repository}${problem.directory}${problem.key ?? ''}${problem.message}`}
                >
                  <code translate="no">{problem.key ?? problem.directory}</code>{' '}
                  {problem.message}
                </li>
              ))}
            </ul>
          </Callout>
        ) : null}
        {status.kind === 'failed' ? (
          <Callout intent="danger">{status.error}</Callout>
        ) : null}
      </DialogBody>
      <DialogFooter
        actions={
          status.kind === 'idle' || status.kind === 'sending' ? (
            <>
              <Button text="Cancel" onClick={close} />
              <Button
                intent="primary"
                icon="git-pull"
                text="Open the pull request"
                loading={status.kind === 'sending'}
                disabled={counts.valid === 0}
                onClick={() => {
                  void submit();
                }}
              />
            </>
          ) : status.kind === 'submitted' ? (
            <Button intent="primary" text="Close" onClick={close} />
          ) : (
            back
          )
        }
      />
    </Dialog>
  );
}

function Submitted(props: {
  outcome: Extract<SubmitOutcome, { kind: 'submitted' }>;
}): ReactElement {
  const { pullRequests } = props.outcome.result;
  if (pullRequests.length === 0) {
    return (
      <Callout intent="success">
        Nothing to propose: every message already reads that way in the
        repository.
      </Callout>
    );
  }
  return (
    <Callout intent="success" title="Thank you — the translation is proposed">
      <ul className="translate-problems">
        {pullRequests.map((pullRequest) => (
          <li key={pullRequest.url}>
            <a href={pullRequest.url} target="_blank" rel="noreferrer">
              {pullRequest.repository} #{pullRequest.number}
            </a>{' '}
            — {pullRequest.messageCount}{' '}
            {pullRequest.messageCount === 1 ? 'message' : 'messages'},{' '}
            {pullRequest.updated
              ? 'added to your open pull request'
              : 'new pull request'}
          </li>
        ))}
      </ul>
    </Callout>
  );
}
