import { describe, expect, it } from 'vitest';
import { encryptJsonRecord } from './encrypted-records.js';
import { createRoomAccess, createRoomToken, parseRoomReference } from './room-reference.js';
import {
  decryptProjectSnapshotsFromRecords,
  isStaleProjectFileSnapshot,
  isStaleProjectFileSnapshotSeq,
  normalizeProjectPath,
  PROJECT_SCHEMA,
} from './project-state.js';

describe('project state replay', () => {
  it('uses append-log sequence rather than client timestamps during encrypted replay', async () => {
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

    expect(snapshots).toHaveLength(3);
    expect(latest?.updatedAt).toBe(older);
    expect(latest?.files.find((file) => file.path === 'docs/PLAN.md')?.markdown).toContain('Older delayed edit.');
  });

  it('compares valid timestamps by time and falls back to lexical order', () => {
    expect(isStaleProjectFileSnapshot('2026-06-12T12:00:02.000Z', '2026-06-12T12:00:01.000Z')).toBe(true);
    expect(isStaleProjectFileSnapshot('2026-06-12T12:00:02.000Z', '2026-06-12T12:00:02.000Z')).toBe(false);
    expect(isStaleProjectFileSnapshot('b', 'a')).toBe(true);
  });

  it('compares project replay freshness by append-log sequence', () => {
    expect(isStaleProjectFileSnapshotSeq(undefined, 1)).toBe(false);
    expect(isStaleProjectFileSnapshotSeq(1, 2)).toBe(false);
    expect(isStaleProjectFileSnapshotSeq(2, 2)).toBe(true);
    expect(isStaleProjectFileSnapshotSeq(3, 2)).toBe(true);
  });

  it('rejects missing append-log sequences during project replay', async () => {
    const access = parseRoomReference(createRoomToken({
      ...createRoomAccess('http://127.0.0.1:8787', 'http://localhost:3000'),
      roomId: 'project-missing-seq',
      roomSecret: 'secret',
    }));
    const records = [
      {
        roomId: access.roomId,
        seq: 1,
        ...(await encryptJsonRecord(access, 'fold-cli:project:seed', {
          schema: PROJECT_SCHEMA,
          primaryPath: 'docs/PLAN.md',
          files: [{ path: 'docs/PLAN.md', markdown: '# Plan\n' }],
          updatedAt: '2026-06-12T12:00:00.000Z',
        })),
      },
      {
        roomId: access.roomId,
        seq: 3,
        ...(await encryptJsonRecord(access, 'web-client:file:missing', {
          type: 'project_file_snapshot',
          path: 'docs/PLAN.md',
          markdown: '# Plan\n\nSkipped seq.',
          updatedAt: '2026-06-12T12:00:01.000Z',
        })),
      },
    ];

    await expect(decryptProjectSnapshotsFromRecords(access, records)).rejects.toThrow(/missing, duplicate, or reordered/);
  });

  it('normalizes benign dot segments and rejects traversal', () => {
    expect(normalizeProjectPath('./docs/./PLAN.md')).toBe('docs/PLAN.md');
    expect(normalizeProjectPath('docs//notes.md')).toBe('docs/notes.md');
    expect(() => normalizeProjectPath('../secret.md')).toThrow(/Invalid project path/);
    expect(() => normalizeProjectPath('docs/../secret.md')).toThrow(/Invalid project path/);
    expect(() => normalizeProjectPath('C:/secret.md')).toThrow(/Invalid project path/);
  });
});
