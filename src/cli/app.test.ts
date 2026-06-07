import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { EncryptedAppendLogServer } from '../../spikes/e2ee-yjs-append-log/server.js';
import { runMdroomCli } from './app.js';

describe('mdroom CLI app', () => {
  it('prints publish JSON through the Stricli route', async () => {
    const cwd = await mkdtemp(join(tmpdir(), 'mdroom-cli-app-'));
    const server = new EncryptedAppendLogServer();
    const serverUrl = await server.start();
    const output = buildOutputCapture();

    try {
      await writeFile(join(cwd, 'cli.md'), '# CLI JSON', 'utf8');
      await runMdroomCli(['publish', 'cli.md', '--server', serverUrl, '--json'], {
        process: {
          stdout: { write: output.stdout.write },
          stderr: { write: output.stderr.write },
        },
        cwd,
      });

      expect(output.stderr.value).toBe('');
      const result = JSON.parse(output.stdout.value) as { schema?: string; room?: { serverRoomUrl?: string; url?: string } };
      expect(result.schema).toBe('mdroom.publish.result.v1');
      expect(result.room?.url).toContain('#key=');
      expect(result.room?.serverRoomUrl).not.toContain('#key=');
    } finally {
      await server.stop();
      await rm(cwd, { recursive: true, force: true });
    }
  });

  it('prints patch JSON through the Stricli route', async () => {
    const cwd = await mkdtemp(join(tmpdir(), 'mdroom-cli-app-'));
    const server = new EncryptedAppendLogServer();
    const serverUrl = await server.start();
    const publishOutput = buildOutputCapture();
    const patchOutput = buildOutputCapture();

    try {
      await writeFile(join(cwd, 'base.md'), '# Base', 'utf8');
      await writeFile(join(cwd, 'proposal.md'), '# Proposal', 'utf8');
      await runMdroomCli(['publish', 'base.md', '--server', serverUrl, '--json'], {
        process: {
          stdout: { write: publishOutput.stdout.write },
          stderr: { write: publishOutput.stderr.write },
        },
        cwd,
      });
      const published = JSON.parse(publishOutput.stdout.value) as { room?: { url?: string } };

      await runMdroomCli(['patch', 'proposal.md', '--room', published.room?.url ?? '', '--json'], {
        process: {
          stdout: { write: patchOutput.stdout.write },
          stderr: { write: patchOutput.stderr.write },
        },
        cwd,
      });

      expect(patchOutput.stderr.value).toBe('');
      const result = JSON.parse(patchOutput.stdout.value) as { schema?: string; mode?: string };
      expect(result.schema).toBe('mdroom.patch.result.v1');
      expect(result.mode).toBe('suggestion');
    } finally {
      await server.stop();
      await rm(cwd, { recursive: true, force: true });
    }
  });
});

function buildOutputCapture(): {
  stdout: { value: string; write: (str: string) => void };
  stderr: { value: string; write: (str: string) => void };
} {
  const stdout = {
    value: '',
    write(str: string) {
      stdout.value += str;
    },
  };
  const stderr = {
    value: '',
    write(str: string) {
      stderr.value += str;
    },
  };

  return { stdout, stderr };
}
