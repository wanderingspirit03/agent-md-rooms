import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import type { EncryptedMarkdownSnapshot, MarkdownDocumentSummary } from './markdown-snapshot.js';

export const ROOM_METADATA_VERSION = 1;

export interface RoomMetadataFile {
  version: typeof ROOM_METADATA_VERSION;
  rooms: RoomMetadataEntry[];
}

export interface RoomMetadataEntry {
  alias?: string;
  roomId: string;
  appUrl?: string;
  syncUrl?: string;
  serverUrl: string;
  roomUrl: string;
  token: string;
  sourcePath?: string;
  createdAt: string;
  updatedAt: string;
  lastUsedAt?: string;
  document: MarkdownDocumentSummary;
  encryptedSnapshot: EncryptedMarkdownSnapshot;
}

export function defaultMetadataPath(cwd: string): string {
  return join(cwd, '.fold', 'rooms.json');
}

export async function readRoomMetadata(path: string): Promise<RoomMetadataFile> {
  let raw: string;
  try {
    raw = await readFile(path, 'utf8');
  } catch (error) {
    if (isNotFoundError(error)) {
      return emptyMetadata();
    }
    throw error;
  }

  const parsed = JSON.parse(raw) as unknown;
  if (!isRoomMetadataFile(parsed)) {
    throw new Error(`Invalid room metadata schema at ${path}`);
  }

  return parsed;
}

export async function writeRoomMetadata(path: string, metadata: RoomMetadataFile): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(metadata, null, 2)}\n`, 'utf8');
}

export async function upsertRoomMetadata(path: string, entry: RoomMetadataEntry): Promise<RoomMetadataFile> {
  const metadata = await readRoomMetadata(path);
  const syncUrl = entry.syncUrl ?? entry.serverUrl;
  const existing = metadata.rooms.findIndex((room) => (
    (entry.alias && room.alias === entry.alias) ||
    (room.roomId === entry.roomId && (room.syncUrl ?? room.serverUrl) === syncUrl)
  ));
  const rooms = [...metadata.rooms];
  if (existing === -1) {
    rooms.push(entry);
  } else {
    rooms[existing] = {
      ...rooms[existing],
      ...entry,
      createdAt: rooms[existing]?.createdAt ?? entry.createdAt,
    };
  }

  const next: RoomMetadataFile = {
    version: ROOM_METADATA_VERSION,
    rooms,
  };
  await writeRoomMetadata(path, next);
  return next;
}

export async function findRoomMetadata(
  path: string,
  roomId: string,
  serverUrl: string,
): Promise<RoomMetadataEntry | undefined> {
  const metadata = await readRoomMetadata(path);
  return metadata.rooms.find((room) => room.roomId === roomId && (room.syncUrl ?? room.serverUrl) === serverUrl);
}

export async function findRoomMetadataByAlias(
  path: string,
  alias: string,
): Promise<RoomMetadataEntry | undefined> {
  const metadata = await readRoomMetadata(path);
  return metadata.rooms.find((room) => room.alias === alias);
}

export async function listRoomMetadata(path: string): Promise<RoomMetadataEntry[]> {
  return (await readRoomMetadata(path)).rooms;
}

export async function removeRoomMetadataByAlias(path: string, alias: string): Promise<RoomMetadataFile> {
  const metadata = await readRoomMetadata(path);
  const next: RoomMetadataFile = {
    version: ROOM_METADATA_VERSION,
    rooms: metadata.rooms.filter((room) => room.alias !== alias),
  };
  if (next.rooms.length === metadata.rooms.length) {
    throw new Error(`Room alias not found: ${alias}`);
  }
  await writeRoomMetadata(path, next);
  return next;
}

export function resolveSourcePath(cwd: string, filePath: string): string {
  return resolve(cwd, filePath);
}

function emptyMetadata(): RoomMetadataFile {
  return {
    version: ROOM_METADATA_VERSION,
    rooms: [],
  };
}

function isRoomMetadataFile(value: unknown): value is RoomMetadataFile {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<RoomMetadataFile>;
  return candidate.version === ROOM_METADATA_VERSION && Array.isArray(candidate.rooms);
}

function isNotFoundError(error: unknown): boolean {
  return Boolean(error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT');
}
