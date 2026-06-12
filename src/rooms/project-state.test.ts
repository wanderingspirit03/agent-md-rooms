import { describe, expect, it } from 'vitest';
import { encryptJsonRecord } from './timeline.js';
import { createRoomAccess, createRoomToken, parseRoomReference } from './room-reference.js';
import {
  decryptProjectSnapshotsFromRecords,
  isStaleProjectFileSnapshot,
  PROJECT_SCHEMA,
} from './project-state.js';

describe('project state replay', () => {
  it('ignores stale web project file snapshots during encrypted replay', async () => {
    const access = parseRoomReference(createRoomToken({
      ...createRoomAccess('http://127.0.0.1:8787', 'http://localhost:3000'),
      roomId: 'project-stale-replay',
      roomSecret: 'secret',
    }));
    const newer = '2026-06-12T12:00:02.000Z';
    const older = '2026-06-12T12:00:01.000Z';
    const records = [
      {
        roomId: access.roomId,
        seq: 1,
        ...(await encryptJsonRecord(access, 'fold-cli:project:seed', {
          schema: PROJECT_SCHEMA,
          primaryPath: 'docs/PLAN.md',
          files: [{ path: 'docs/PLAN.md', markdown: '# Plan\n\nSeed.' }],
          updatedAt: '2026-06-12T12:00:00.000Z',
        })),
      },
      {
        roomId: access.roomId,
        seq: 2,
        ...(await encryptJsonRecord(access, 'web-client:file:newer', {
          type: 'project_file_snapshot',
          path: 'docs/PLAN.md',
          markdown: '# Plan\n\nNewer collaborator edit.',
          updatedAt: newer,
        })),
      },
      {
        roomId: access.roomId,
        seq: 3,
        ...(await encryptJsonRecord(access, 'web-client:file:older-delayed', {
          type: 'project_file_snapshot',
          path: 'docs/PLAN.md',
          markdown: '# Plan\n\nOlder delayed edit.',
          updatedAt: older,
        })),
      },
    ];

    const snapshots = await decryptProjectSnapshotsFromRecords(access, records);
    const latest = snapshots.at(-1);

    expect(snapshots).toHaveLength(2);
    expect(latest?.updatedAt).toBe(newer);
    expect(latest?.files.find((file) => file.path === 'docs/PLAN.md')?.markdown).toContain('Newer collaborator edit.');
  });

  it('compares valid timestamps by time and falls back to lexical order', () => {
    expect(isStaleProjectFileSnapshot('2026-06-12T12:00:02.000Z', '2026-06-12T12:00:01.000Z')).toBe(true);
    expect(isStaleProjectFileSnapshot('2026-06-12T12:00:02.000Z', '2026-06-12T12:00:02.000Z')).toBe(false);
    expect(isStaleProjectFileSnapshot('b', 'a')).toBe(true);
  });
});
