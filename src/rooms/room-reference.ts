import { webcrypto } from 'node:crypto';

export const ROOM_TOKEN_PREFIX = 'fold:v1:';
export const DEFAULT_SERVER_URL = 'http://localhost:8787';

export interface RoomAccess {
  roomId: string;
  roomSecret: string;
  appUrl: string;
  syncUrl: string;
  serverUrl: string;
}

export interface ParsedRoomReference extends RoomAccess {
  kind: 'token' | 'url';
  roomUrl: string;
  serverRoomUrl: string;
}

interface EncodedRoomToken {
  v: 1;
  roomId: string;
  roomSecret: string;
  appUrl?: string;
  syncUrl?: string;
  serverUrl?: string;
}

export function createRoomAccess(serverUrl = DEFAULT_SERVER_URL, appUrl = serverUrl, syncUrl = serverUrl): RoomAccess {
  return {
    roomId: randomBase64Url(16),
    roomSecret: randomBase64Url(32),
    appUrl: normalizeServerUrl(appUrl),
    syncUrl: normalizeServerUrl(syncUrl),
    serverUrl: normalizeServerUrl(syncUrl),
  };
}

export function createRoomToken(access: RoomAccess): string {
  const token: EncodedRoomToken = {
    v: 1,
    roomId: access.roomId,
    roomSecret: access.roomSecret,
    appUrl: normalizeServerUrl(access.appUrl ?? access.serverUrl),
    syncUrl: normalizeServerUrl(access.syncUrl ?? access.serverUrl),
  };

  return `${ROOM_TOKEN_PREFIX}${Buffer.from(JSON.stringify(token), 'utf8').toString('base64url')}`;
}

export function parseRoomReference(input: string): ParsedRoomReference {
  if (input.startsWith(ROOM_TOKEN_PREFIX)) {
    return parsedFromAccess(parseRoomToken(input), 'token');
  }

  return parseRoomUrl(input);
}

export function roomUrlForAccess(access: RoomAccess): string {
  return `${appRoomUrlForAccess(access)}#key=${encodeURIComponent(access.roomSecret)}`;
}

export function serverRoomUrlForAccess(access: RoomAccess): string {
  return appRoomUrlForAccess(access);
}

export function appRoomUrlForAccess(access: RoomAccess): string {
  return `${normalizeServerUrl(access.appUrl ?? access.serverUrl)}/room/${encodeURIComponent(access.roomId)}`;
}

export function normalizeServerUrl(input: string): string {
  let parsed: URL;
  try {
    parsed = new URL(input);
  } catch (error) {
    throw new Error(`Invalid server URL ${JSON.stringify(input)}`, { cause: error });
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error(`Server URL must use http or https: ${JSON.stringify(input)}`);
  }

  parsed.hash = '';
  parsed.search = '';
  parsed.pathname = parsed.pathname.replace(/\/+$/, '');
  return parsed.toString().replace(/\/$/, '');
}

function parseRoomToken(input: string): RoomAccess {
  const encoded = input.slice(ROOM_TOKEN_PREFIX.length);
  let raw: unknown;
  try {
    raw = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as unknown;
  } catch (error) {
    throw new Error('Invalid fold token encoding', { cause: error });
  }

  if (!isEncodedRoomToken(raw)) {
    throw new Error('Invalid fold token schema');
  }

  return {
    roomId: raw.roomId,
    roomSecret: raw.roomSecret,
    appUrl: normalizeServerUrl(raw.appUrl ?? raw.serverUrl ?? DEFAULT_SERVER_URL),
    syncUrl: normalizeServerUrl(raw.syncUrl ?? raw.serverUrl ?? raw.appUrl ?? DEFAULT_SERVER_URL),
    serverUrl: normalizeServerUrl(raw.syncUrl ?? raw.serverUrl ?? raw.appUrl ?? DEFAULT_SERVER_URL),
  };
}

function parseRoomUrl(input: string): ParsedRoomReference {
  let parsed: URL;
  try {
    parsed = new URL(input);
  } catch (error) {
    throw new Error('Room must be a fold token or room URL', { cause: error });
  }

  const roomPath = roomPathFromUrl(parsed);
  const fragment = new URLSearchParams(parsed.hash.startsWith('#') ? parsed.hash.slice(1) : parsed.hash);
  const roomSecret = fragment.get('key');

  if (!roomPath) {
    throw new Error('Room URL must contain /room/:roomId');
  }

  if (!roomSecret) {
    throw new Error('Room URL must contain client-side key material in #key=...');
  }

  return parsedFromAccess({
    roomId: roomPath.roomId,
    roomSecret,
    appUrl: roomPath.serverUrl,
    syncUrl: roomPath.serverUrl,
    serverUrl: roomPath.serverUrl,
  }, 'url');
}

function parsedFromAccess(access: RoomAccess, kind: ParsedRoomReference['kind']): ParsedRoomReference {
  const normalized = {
    ...access,
    appUrl: normalizeServerUrl(access.appUrl ?? access.serverUrl),
    syncUrl: normalizeServerUrl(access.syncUrl ?? access.serverUrl),
    serverUrl: normalizeServerUrl(access.syncUrl ?? access.serverUrl),
  };

  return {
    ...normalized,
    kind,
    roomUrl: roomUrlForAccess(normalized),
    serverRoomUrl: serverRoomUrlForAccess(normalized),
  };
}

function roomPathFromUrl(url: URL): { roomId: string; serverUrl: string } | null {
  const parts = url.pathname.split('/').filter(Boolean);
  const roomIndex = parts.lastIndexOf('room');
  if (roomIndex === -1 || roomIndex === parts.length - 1) return null;

  const serverPath = parts.slice(0, roomIndex).join('/');
  const serverUrl = serverPath ? `${url.origin}/${serverPath}` : url.origin;
  return {
    roomId: decodeURIComponent(parts[roomIndex + 1] ?? ''),
    serverUrl,
  };
}

function isEncodedRoomToken(value: unknown): value is EncodedRoomToken {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<EncodedRoomToken>;
  return (
    candidate.v === 1 &&
    typeof candidate.roomId === 'string' &&
    candidate.roomId.length > 0 &&
    typeof candidate.roomSecret === 'string' &&
    candidate.roomSecret.length > 0 &&
    (
      (typeof candidate.serverUrl === 'string' && candidate.serverUrl.length > 0) ||
      (typeof candidate.appUrl === 'string' && candidate.appUrl.length > 0) ||
      (typeof candidate.syncUrl === 'string' && candidate.syncUrl.length > 0)
    )
  );
}

function randomBase64Url(byteLength: number): string {
  const bytes = webcrypto.getRandomValues(new Uint8Array(byteLength));
  return Buffer.from(bytes).toString('base64url');
}
