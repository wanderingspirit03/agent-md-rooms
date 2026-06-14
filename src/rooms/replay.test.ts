import { describe, expect, it } from 'vitest';
import { AppendLogStore } from '../server/append-log.js';
import { createEncryptedCommentRecord, type RoomComment } from './comments.js';
import { encryptJsonRecord } from './encrypted-records.js';
import { PROJECT_SCHEMA } from './project-state.js';
import { createEncryptedProposalRecord } from './proposals.js';
import { replayRoomRecords } from './replay.js';
import { createRoomAccess } from './room-reference.js';

describe('room replay boundary', () => {
  it('replays project, proposals, comments, and timeline from the same ordered records', async () => {
    const access = createRoomAccess();
    const store = new AppendLogStore();
    await store.append(access.roomId, await encryptJsonRecord(access, 'fold-cli:project:seed', {
      schema: PROJECT_SCHEMA,
      primaryPath: 'README.md',
      files: [{ path: 'README.md', markdown: '# Replay\n' }],
      updatedAt: '2026-06-14T00:00:00.000Z',
    }));

    const { update, timelineEvent } = await createEncryptedProposalRecord({
      access,
      baseMarkdown: '# Replay\n',
      proposedMarkdown: '# Replay\n\nProposal.\n',
      title: 'Replay proposal',
    });
    await store.append(access.roomId, update);
    await store.append(access.roomId, await encryptJsonRecord(access, 'fold-cli:event:proposal-submitted', timelineEvent));

    const comment: RoomComment = {
      id: 'comment-1',
      authorPersonaId: 'persona-agent',
      persona: {
        schema: 'fold.persona.v1',
        id: 'persona-agent',
        name: 'Patch Pilot',
        label: 'Agent',
        kind: 'agent',
        color: '#1e3a8a',
        participantFingerprint: 'agent',
      },
      text: 'Replay this comment.',
      createdAt: '2026-06-14T00:01:00.000Z',
      type: 'note',
    };
    await store.append(access.roomId, await createEncryptedCommentRecord(access, comment));

    const replay = await replayRoomRecords(access, store.list(access.roomId));

    expect(replay.projectSnapshots.at(-1)?.primaryPath).toBe('README.md');
    expect(replay.proposals.proposals[0]?.title).toBe('Replay proposal');
    expect(replay.comments[0]?.text).toBe('Replay this comment.');
    expect(replay.timeline.map((event) => event.type)).toContain('proposal_submitted');
  });
});
