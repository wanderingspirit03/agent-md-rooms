import { chmod, mkdtemp, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  ROOM_METADATA_DIR_MODE,
  ROOM_METADATA_FILE_MODE,
  defaultMetadataPath,
  writeRoomMetadata,
} from './metadata.js';

describe('room metadata storage', () => {
  it('writes local room metadata with restrictive POSIX permissions', async () => {
    if (process.platform === 'win32') return;

    const cwd = await mkdtemp(join(tmpdir(), 'fold-metadata-'));
    const metadataPath = defaultMetadataPath(cwd);
    try {
      await writeRoomMetadata(metadataPath, { version: 1, rooms: [] });

      expect((await stat(dirname(metadataPath))).mode & 0o777).toBe(ROOM_METADATA_DIR_MODE);
      expect((await stat(metadataPath)).mode & 0o777).toBe(ROOM_METADATA_FILE_MODE);
    } finally {
      await rm(cwd, { recursive: true, force: true });
    }
  });

  it('tightens permissions on existing local room metadata paths', async () => {
    if (process.platform === 'win32') return;

    const cwd = await mkdtemp(join(tmpdir(), 'fold-metadata-existing-'));
    const metadataPath = defaultMetadataPath(cwd);
    try {
      await writeRoomMetadata(metadataPath, { version: 1, rooms: [] });
      await chmod(dirname(metadataPath), 0o777);
      await chmod(metadataPath, 0o666);
      await writeFile(metadataPath, '{"version":1,"rooms":[]}\n', 'utf8');

      await writeRoomMetadata(metadataPath, { version: 1, rooms: [] });

      expect((await stat(dirname(metadataPath))).mode & 0o777).toBe(ROOM_METADATA_DIR_MODE);
      expect((await stat(metadataPath)).mode & 0o777).toBe(ROOM_METADATA_FILE_MODE);
    } finally {
      await rm(cwd, { recursive: true, force: true });
    }
  });
});
