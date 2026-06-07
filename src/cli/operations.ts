import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { mkdir } from 'node:fs/promises';
import {
  createEncryptedMarkdownSnapshot,
  createEncryptedMarkdownUpdate,
  decryptMarkdownFromRecords,
  decryptMarkdownSnapshot,
  summarizeMarkdown,
} from '../rooms/markdown-snapshot.js';
import {
  createRoomAccess,
  createRoomToken,
  DEFAULT_SERVER_URL,
  parseRoomReference,
  roomUrlForAccess,
  serverRoomUrlForAccess,
  type RoomAccess,
} from '../rooms/room-reference.js';
import {
  appendEncryptedUpdate,
  fetchRoomStatus,
  listEncryptedUpdates,
} from '../rooms/append-log-api.js';
import {
  defaultMetadataPath,
  findRoomMetadata,
  resolveSourcePath,
  upsertRoomMetadata,
  type RoomMetadataEntry,
} from '../rooms/metadata.js';
import {
  createEncryptedPatchSuggestion,
} from '../rooms/patch-suggestion.js';
import type { ExportResult, PatchResult, PublicRoomResult, PublishResult, StatusResult } from './results.js';

const CLI_SENDER_ID = 'mdroom-cli:document';

export interface PublishOptions {
  cwd: string;
  filePath: string;
  serverUrl?: string;
  save: boolean;
}

export interface ExportOptions {
  cwd: string;
  room: string;
  outputPath?: string;
}

export interface StatusOptions {
  cwd: string;
  room: string;
}

export interface PatchOptions {
  cwd: string;
  filePath: string;
  room: string;
  summary?: string;
}

export async function publishMarkdown(options: PublishOptions): Promise<PublishResult> {
  const sourcePath = resolveSourcePath(options.cwd, options.filePath);
  const markdown = await readFile(sourcePath, 'utf8');
  const access = createRoomAccess(options.serverUrl ?? DEFAULT_SERVER_URL);
  const document = summarizeMarkdown(markdown);
  const encryptedUpdate = await createEncryptedMarkdownUpdate(markdown, access, CLI_SENDER_ID);
  const record = await appendEncryptedUpdate(access, encryptedUpdate);
  const encryptedSnapshot = await createEncryptedMarkdownSnapshot(markdown, access, CLI_SENDER_ID);
  const token = createRoomToken(access);
  const metadataPath = defaultMetadataPath(options.cwd);
  const now = new Date().toISOString();

  if (options.save) {
    const entry: RoomMetadataEntry = {
      roomId: access.roomId,
      serverUrl: access.serverUrl,
      roomUrl: roomUrlForAccess(access),
      token,
      sourcePath,
      createdAt: now,
      updatedAt: now,
      document,
      encryptedSnapshot,
    };
    await upsertRoomMetadata(metadataPath, entry);
  }

  return {
    schema: 'mdroom.publish.result.v1',
    ok: true,
    mode: 'server-backed',
    room: publicRoomResult(access, token),
    metadata: {
      path: metadataPath,
      saved: options.save,
    },
    document,
    server: {
      recordCount: record.seq,
      latestSeq: record.seq,
    },
  };
}

export async function exportMarkdown(options: ExportOptions): Promise<ExportResult> {
  const reference = parseRoomReference(options.room);
  const metadataPath = defaultMetadataPath(options.cwd);
  const entry = await findRoomMetadata(metadataPath, reference.roomId, reference.serverUrl);
  const records = await listEncryptedUpdates(reference);
  const markdown = records.length > 0
    ? await decryptMarkdownFromRecords(records, reference)
    : await decryptLocalSnapshotOrThrow(entry, reference);
  const document = summarizeMarkdown(markdown);
  const outputPath = options.outputPath ? resolve(options.cwd, options.outputPath) : null;
  if (outputPath) {
    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, markdown, 'utf8');
  }

  return {
    schema: 'mdroom.export.result.v1',
    ok: true,
    mode: 'server-backed',
    room: publicRoomResult(reference, createRoomToken(reference)),
    metadata: {
      path: metadataPath,
      found: Boolean(entry),
    },
    output: {
      path: outputPath,
      written: Boolean(outputPath),
      bytes: document.bytes,
      sha256: document.sha256,
    },
    document: {
      ...document,
      markdown,
    },
    server: {
      recordCount: records.length,
      latestSeq: records.at(-1)?.seq ?? null,
    },
  };
}

export async function roomStatus(options: StatusOptions): Promise<StatusResult> {
  const reference = parseRoomReference(options.room);
  const metadataPath = defaultMetadataPath(options.cwd);
  const entry = await findRoomMetadata(metadataPath, reference.roomId, reference.serverUrl);
  const status = await fetchRoomStatus(reference);

  return {
    schema: 'mdroom.status.result.v1',
    ok: true,
    mode: 'server-backed',
    room: publicRoomResult(reference, createRoomToken(reference)),
    metadata: {
      path: metadataPath,
      found: Boolean(entry),
      sourcePath: entry?.sourcePath ?? null,
      createdAt: entry?.createdAt ?? null,
      updatedAt: entry?.updatedAt ?? null,
    },
    document: entry?.document ?? null,
    server: {
      checked: true,
      recordCount: status.recordCount,
      latestSeq: status.latestSeq,
    },
  };
}

export async function patchMarkdown(options: PatchOptions): Promise<PatchResult> {
  const reference = parseRoomReference(options.room);
  const metadataPath = defaultMetadataPath(options.cwd);
  const entry = await findRoomMetadata(metadataPath, reference.roomId, reference.serverUrl);
  const records = await listEncryptedUpdates(reference);
  const baseMarkdown = records.length > 0
    ? await decryptMarkdownFromRecords(records, reference)
    : await decryptLocalSnapshotOrThrow(entry, reference);
  const proposedMarkdown = await readFile(resolveSourcePath(options.cwd, options.filePath), 'utf8');
  const { update, suggestion } = await createEncryptedPatchSuggestion(
    reference,
    baseMarkdown,
    proposedMarkdown,
    options.summary,
  );
  const record = await appendEncryptedUpdate(reference, update);

  return {
    schema: 'mdroom.patch.result.v1',
    ok: true,
    mode: 'suggestion',
    room: publicRoomResult(reference, createRoomToken(reference)),
    metadata: {
      path: metadataPath,
      found: Boolean(entry),
    },
    base: summarizeMarkdown(baseMarkdown),
    proposed: summarizeMarkdown(proposedMarkdown),
    suggestion: suggestion.suggestion,
    server: {
      recordCount: record.seq,
      latestSeq: record.seq,
    },
  };
}

function publicRoomResult(access: RoomAccess, token: string): PublicRoomResult {
  return {
    roomId: access.roomId,
    serverUrl: access.serverUrl,
    serverRoomUrl: serverRoomUrlForAccess(access),
    url: roomUrlForAccess(access),
    token,
    hasClientKey: true,
  };
}

async function decryptLocalSnapshotOrThrow(
  entry: RoomMetadataEntry | undefined,
  access: RoomAccess,
): Promise<string> {
  if (!entry) {
    throw new Error('No server records or local metadata found for room');
  }
  return decryptMarkdownSnapshot(entry.encryptedSnapshot, access);
}
