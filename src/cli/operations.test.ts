import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { EncryptedAppendLogServer } from '../../spikes/e2ee-yjs-append-log/server.js';
import { decryptPatchSuggestion } from '../rooms/patch-suggestion.js';
import { defaultMetadataPath, readRoomMetadata } from '../rooms/metadata.js';
import { exportMarkdown, patchMarkdown, publishMarkdown, roomStatus } from './operations.js';

describe('CLI operations', () => {
  it('publishes Markdown as encrypted local metadata by default', async () => {
    const cwd = await mkdtemp(join(tmpdir(), 'mdroom-cli-'));
    const server = new EncryptedAppendLogServer();
    const serverUrl = await server.start();
    try {
      await writeFile(join(cwd, 'report.md'), '# Agent Report\n\nPrivate body.', 'utf8');

      const result = await publishMarkdown({
        cwd,
        filePath: 'report.md',
        serverUrl,
        save: true,
      });

      expect(result.schema).toBe('mdroom.publish.result.v1');
      expect(result.mode).toBe('server-backed');
      expect(result.room.url).toContain('#key=');
      expect(result.room.serverRoomUrl).not.toContain('#key=');
      expect(result.metadata.saved).toBe(true);
      expect(result.document.canonical).toBe('y.text:markdown');
      expect(result.server.recordCount).toBe(1);

      const rawMetadata = await readFile(defaultMetadataPath(cwd), 'utf8');
      expect(rawMetadata).not.toContain('Private body.');
      const metadata = await readRoomMetadata(defaultMetadataPath(cwd));
      expect(metadata.rooms).toHaveLength(1);
      expect(metadata.rooms[0]?.encryptedSnapshot.format).toBe('encrypted-yjs-update-v1');
      expect(server.store.serialized(result.room.roomId)).not.toContain('Private body.');
    } finally {
      await server.stop();
      await rm(cwd, { recursive: true, force: true });
    }
  });

  it('does not write metadata when --no-save behavior is requested', async () => {
    const cwd = await mkdtemp(join(tmpdir(), 'mdroom-cli-'));
    const server = new EncryptedAppendLogServer();
    const serverUrl = await server.start();
    try {
      await writeFile(join(cwd, 'draft.md'), 'unsaved draft', 'utf8');

      const result = await publishMarkdown({
        cwd,
        filePath: 'draft.md',
        serverUrl,
        save: false,
      });

      expect(result.metadata.saved).toBe(false);
      expect(result.server.recordCount).toBe(1);
      await expect(readFile(defaultMetadataPath(cwd), 'utf8')).rejects.toMatchObject({ code: 'ENOENT' });
    } finally {
      await server.stop();
      await rm(cwd, { recursive: true, force: true });
    }
  });

  it('exports Markdown by decrypting the saved Y.Text snapshot locally', async () => {
    const cwd = await mkdtemp(join(tmpdir(), 'mdroom-cli-'));
    const server = new EncryptedAppendLogServer();
    const serverUrl = await server.start();
    try {
      const markdown = '# Export Me\n\n- from encrypted local metadata';
      await writeFile(join(cwd, 'export-me.md'), markdown, 'utf8');
      const published = await publishMarkdown({
        cwd,
        filePath: 'export-me.md',
        serverUrl,
        save: true,
      });

      const exported = await exportMarkdown({
        cwd,
        room: published.room.token,
        outputPath: 'out/exported.md',
      });

      expect(exported.schema).toBe('mdroom.export.result.v1');
      expect(exported.document.markdown).toBe(markdown);
      expect(exported.output.written).toBe(true);
      expect(exported.server.recordCount).toBe(1);
      expect(await readFile(join(cwd, 'out', 'exported.md'), 'utf8')).toBe(markdown);
    } finally {
      await server.stop();
      await rm(cwd, { recursive: true, force: true });
    }
  });

  it('reports local room status with a stable schema', async () => {
    const cwd = await mkdtemp(join(tmpdir(), 'mdroom-cli-'));
    const server = new EncryptedAppendLogServer();
    const serverUrl = await server.start();
    try {
      await mkdir(join(cwd, 'nested'));
      await writeFile(join(cwd, 'nested', 'status.md'), 'status text', 'utf8');
      const published = await publishMarkdown({
        cwd,
        filePath: 'nested/status.md',
        serverUrl,
        save: true,
      });

      const status = await roomStatus({
        cwd,
        room: published.room.url,
      });

      expect(status.schema).toBe('mdroom.status.result.v1');
      expect(status.metadata.found).toBe(true);
      expect(status.document?.bytes).toBe(Buffer.byteLength('status text', 'utf8'));
      expect(status.server.checked).toBe(true);
      expect(status.server.recordCount).toBe(1);
      expect(status.room.serverRoomUrl).not.toContain('#key=');
    } finally {
      await server.stop();
      await rm(cwd, { recursive: true, force: true });
    }
  });

  it('finds local metadata by room URL when the server has a base path', async () => {
    const cwd = await mkdtemp(join(tmpdir(), 'mdroom-cli-'));
    const server = new EncryptedAppendLogServer();
    const serverUrl = await server.start();
    try {
      const markdown = '# Base Path Room\n\nURL lookup should preserve the server prefix.';
      await writeFile(join(cwd, 'base-path.md'), markdown, 'utf8');
      const published = await publishMarkdown({
        cwd,
        filePath: 'base-path.md',
        serverUrl: `${serverUrl}/base`,
        save: true,
      });

      const status = await roomStatus({
        cwd,
        room: published.room.url,
      });
      const exported = await exportMarkdown({
        cwd,
        room: published.room.url,
      });

      expect(published.room.serverRoomUrl).toContain('/base/room/');
      expect(status.metadata.found).toBe(true);
      expect(status.server.recordCount).toBe(1);
      expect(exported.document.markdown).toBe(markdown);
    } finally {
      await server.stop();
      await rm(cwd, { recursive: true, force: true });
    }
  });

  it('submits encrypted whole-document patch suggestions without changing export', async () => {
    const cwd = await mkdtemp(join(tmpdir(), 'mdroom-cli-'));
    const server = new EncryptedAppendLogServer();
    const serverUrl = await server.start();
    try {
      const original = '# Patch Base\n\nOriginal body.';
      const proposed = '# Patch Base\n\nProposed body.';
      await writeFile(join(cwd, 'room.md'), original, 'utf8');
      await writeFile(join(cwd, 'proposal.md'), proposed, 'utf8');
      const published = await publishMarkdown({
        cwd,
        filePath: 'room.md',
        serverUrl,
        save: true,
      });

      const patch = await patchMarkdown({
        cwd,
        filePath: 'proposal.md',
        room: published.room.url,
        summary: 'Update body copy',
      });
      const exported = await exportMarkdown({
        cwd,
        room: published.room.url,
      });

      expect(patch.schema).toBe('mdroom.patch.result.v1');
      expect(patch.mode).toBe('suggestion');
      expect(patch.server.recordCount).toBe(2);
      expect(patch.base.sha256).toBe(published.document.sha256);
      expect(patch.proposed.bytes).toBe(Buffer.byteLength(proposed, 'utf8'));
      expect(exported.document.markdown).toBe(original);

      const serverStorage = server.store.serialized(published.room.roomId);
      expect(serverStorage).not.toContain(original);
      expect(serverStorage).not.toContain(proposed);
      const suggestionRecord = server.store.list(published.room.roomId)[1];
      expect(suggestionRecord?.senderId).toContain('mdroom-cli:suggestion');
      const decrypted = await decryptPatchSuggestion(
        {
          roomId: published.room.roomId,
          roomSecret: published.room.url.split('#key=')[1] ?? '',
          serverUrl,
        },
        suggestionRecord!,
        suggestionRecord!.senderId,
      );
      expect(decrypted.proposed.markdown).toBe(proposed);
      expect(decrypted.summary).toBe('Update body copy');
    } finally {
      await server.stop();
      await rm(cwd, { recursive: true, force: true });
    }
  });
});
