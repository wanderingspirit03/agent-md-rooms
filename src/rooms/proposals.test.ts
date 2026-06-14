import { describe, expect, it } from 'vitest';
import { AppendLogStore } from '../server/append-log.js';
import { COMMENT_EVENT_SENDER_ID_PREFIX } from './comments.js';
import {
  createEncryptedProposalRecord,
  createProposalAcceptedEvent,
  createProposalRejectedEvent,
  replayProposalsFromRecords,
} from './proposals.js';
import { createRoomAccess } from './room-reference.js';
import { encryptJsonRecord } from './encrypted-records.js';

describe('encrypted proposal model', () => {
  it('derives proposal status transitions by replaying encrypted room records', async () => {
    const access = createRoomAccess();
    const store = new AppendLogStore();
    const submitted = await createEncryptedProposalRecord({
      access,
      baseMarkdown: '# Base',
      proposedMarkdown: '# Proposed',
      title: 'Update body',
      comment: 'Tighten copy.',
      participantFingerprint: 'fold-cli:proposal',
    });
    store.append(access.roomId, submitted.update);

    let replayed = await replayProposalsFromRecords(access, store.list(access.roomId));
    expect(replayed.proposals).toHaveLength(1);
    expect(replayed.proposals[0]?.status).toBe('pending');
    expect(replayed.proposals[0]?.persona.kind).toBe('agent');
    expect(replayed.proposals[0]?.authorPersonaId).toBe(replayed.proposals[0]?.persona.id);
    expect(replayed.proposals[0]?.baseVersionId).toBe(replayed.proposals[0]?.base.sha256);
    expect(replayed.proposals[0]?.proposedMarkdown).toBe('# Proposed');
    expect(replayed.proposals[0]?.diff).toContain('@@ whole-document-replacement @@');
    expect(replayed.proposals[0]?.discussionThreadIds).toEqual([]);
    expect(store.list(access.roomId)[0]?.senderId).not.toContain(replayed.proposals[0]?.id ?? '');

    const replyEvent = {
      id: 'ev-proposal-reply-1',
      type: 'proposal_replied',
      createdAt: new Date().toISOString(),
      actorPersonaId: replayed.proposals[0]!.persona.id,
      proposalId: replayed.proposals[0]!.id,
      filePath: 'README.md',
      message: 'Asked for another pass',
      reply: {
        id: 'proposal-reply-1',
        authorPersonaId: replayed.proposals[0]!.persona.id,
        persona: replayed.proposals[0]!.persona,
        text: 'Please make the proposal more specific.',
        createdAt: new Date().toISOString(),
      },
    };
    store.append(access.roomId, await encryptJsonRecord(access, `${COMMENT_EVENT_SENDER_ID_PREFIX}:${replyEvent.id}`, replyEvent));
    replayed = await replayProposalsFromRecords(access, store.list(access.roomId));
    expect(replayed.proposals[0]?.replies?.[0]?.text).toBe('Please make the proposal more specific.');
    expect(store.serialized(access.roomId)).not.toContain('Please make the proposal more specific.');

    store.append(access.roomId, await createProposalAcceptedEvent(
      access,
      replayed.proposals[0]!,
      'sha-accepted',
      'persona-human-reviewer',
    ));
    replayed = await replayProposalsFromRecords(access, store.list(access.roomId));
    expect(replayed.proposals[0]?.status).toBe('accepted');
    expect(replayed.timeline.at(-1)?.actorPersonaId).toBe('persona-human-reviewer');

    store.append(access.roomId, submitted.update);
    replayed = await replayProposalsFromRecords(access, store.list(access.roomId));
    expect(replayed.proposals[0]?.status).toBe('accepted');

    store.append(access.roomId, await createProposalRejectedEvent(
      access,
      replayed.proposals[0]!,
      'persona-human-reviewer',
      'superseded',
    ));
    replayed = await replayProposalsFromRecords(access, store.list(access.roomId));
    expect(replayed.proposals[0]?.status).toBe('accepted');

    const withMissingSeq = store.list(access.roomId).filter((record) => record.seq !== 2);
    await expect(replayProposalsFromRecords(access, withMissingSeq)).rejects.toThrow(/expected 2/);
  });
});
